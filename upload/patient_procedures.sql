-- =============================================================================
-- Stored Procedure: Patient Management Operations
-- =============================================================================
-- Module: Patient Registration
-- Author: System
-- Created: 2024-01-15
-- =============================================================================

CREATE PROCEDURE sp_Patient_Create
    @MRN VARCHAR(20),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @DateOfBirth DATE,
    @Gender CHAR(1),
    @Phone VARCHAR(20) = NULL,
    @Email VARCHAR(100) = NULL,
    @Address NVARCHAR(500) = NULL,
    @City NVARCHAR(100) = NULL,
    @State NVARCHAR(50) = NULL,
    @ZipCode VARCHAR(20) = NULL,
    @BranchID UNIQUEIDENTIFIER,
    @CurrentUserID UNIQUEIDENTIFIER,
    @PatientID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validation: MRN is required
        IF @MRN IS NULL OR LTRIM(RTRIM(@MRN)) = ''
        BEGIN
            RAISERROR('MRN is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: First Name is required
        IF @FirstName IS NULL OR LTRIM(RTRIM(@FirstName)) = ''
        BEGIN
            RAISERROR('First Name is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Last Name is required
        IF @LastName IS NULL OR LTRIM(RTRIM(@LastName)) = ''
        BEGIN
            RAISERROR('Last Name is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Date of Birth is required
        IF @DateOfBirth IS NULL
        BEGIN
            RAISERROR('Date of Birth is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Gender is required and must be valid
        IF @Gender IS NULL OR @Gender NOT IN ('M', 'F', 'O')
        BEGIN
            RAISERROR('Gender must be M, F, or O', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Branch must exist
        IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchID = @BranchID AND IsActive = 1)
        BEGIN
            RAISERROR('Invalid Branch selected', 16, 1);
            RETURN -2;
        END
        
        -- Validation: MRN must be unique (not deleted)
        IF EXISTS (SELECT 1 FROM Patients WHERE MRN = @MRN AND IsDeleted = 0)
        BEGIN
            RAISERROR('Patient with this MRN already exists', 16, 1);
            RETURN -5;
        END
        
        -- Validation: Email format check
        IF @Email IS NOT NULL AND @Email <> '' AND @Email NOT LIKE '%@%.%'
        BEGIN
            RAISERROR('Invalid email format', 16, 1);
            RETURN -3;
        END
        
        -- Validation: Age must be reasonable (not future date)
        IF @DateOfBirth > GETDATE()
        BEGIN
            RAISERROR('Date of Birth cannot be in the future', 16, 1);
            RETURN -4;
        END
        
        -- Validation: Age must not exceed 150 years
        IF DATEDIFF(YEAR, @DateOfBirth, GETDATE()) > 150
        BEGIN
            RAISERROR('Invalid Date of Birth', 16, 1);
            RETURN -4;
        END
        
        -- Generate new PatientID
        SET @PatientID = NEWID();
        
        -- Insert the patient record
        INSERT INTO Patients (
            PatientID, MRN, FirstName, LastName, DateOfBirth, Gender,
            Phone, Email, Address, City, State, ZipCode,
            BranchID, IsActive, IsDeleted,
            CreatedBy, CreatedOn
        )
        VALUES (
            @PatientID, @MRN, @FirstName, @LastName, @DateOfBirth, @Gender,
            @Phone, @Email, @Address, @City, @State, @ZipCode,
            @BranchID, 1, 0,
            @CurrentUserID, GETDATE()
        );
        
        COMMIT TRANSACTION;
        
        -- Log the creation
        INSERT INTO AuditLog (TableName, RecordID, ActionType, UserID, ActionDate, Details)
        VALUES ('Patients', @PatientID, 'CREATE', @CurrentUserID, GETDATE(), 'Patient created: ' + @MRN);
        
        RETURN 0;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Log the error
        INSERT INTO ErrorLog (ErrorNumber, ErrorSeverity, ErrorState, ErrorProcedure, ErrorLine, ErrorMessage)
        VALUES (ERROR_NUMBER(), ERROR_SEVERITY(), ERROR_STATE(), ERROR_PROCEDURE(), ERROR_LINE(), ERROR_MESSAGE());
        
        RAISERROR('Failed to create patient: %s', 16, 1, ERROR_MESSAGE());
        RETURN -99;
    END CATCH
END
GO

-- =============================================================================
-- Stored Procedure: Patient Update
-- =============================================================================

CREATE PROCEDURE sp_Patient_Update
    @PatientID UNIQUEIDENTIFIER,
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Phone VARCHAR(20) = NULL,
    @Email VARCHAR(100) = NULL,
    @Address NVARCHAR(500) = NULL,
    @City NVARCHAR(100) = NULL,
    @State NVARCHAR(50) = NULL,
    @ZipCode VARCHAR(20) = NULL,
    @CurrentUserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validation: Patient must exist
        IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientID = @PatientID AND IsDeleted = 0)
        BEGIN
            RAISERROR('Patient not found', 16, 1);
            RETURN -1;
        END
        
        -- Validation: First Name is required
        IF @FirstName IS NULL OR LTRIM(RTRIM(@FirstName)) = ''
        BEGIN
            RAISERROR('First Name is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Last Name is required
        IF @LastName IS NULL OR LTRIM(RTRIM(@LastName)) = ''
        BEGIN
            RAISERROR('Last Name is required', 16, 1);
            RETURN -1;
        END
        
        -- Validation: Email format
        IF @Email IS NOT NULL AND @Email <> '' AND @Email NOT LIKE '%@%.%'
        BEGIN
            RAISERROR('Invalid email format', 16, 1);
            RETURN -3;
        END
        
        -- Update the patient
        UPDATE Patients
        SET FirstName = @FirstName,
            LastName = @LastName,
            Phone = @Phone,
            Email = @Email,
            Address = @Address,
            City = @City,
            State = @State,
            ZipCode = @ZipCode,
            ModifiedBy = @CurrentUserID,
            ModifiedOn = GETDATE()
        WHERE PatientID = @PatientID;
        
        COMMIT TRANSACTION;
        
        RETURN 0;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        RAISERROR('Failed to update patient: %s', 16, 1, ERROR_MESSAGE());
        RETURN -99;
    END CATCH
END
GO

-- =============================================================================
-- Stored Procedure: Patient Search (List/Grid)
-- =============================================================================

CREATE PROCEDURE sp_Patient_Search
    @SearchTerm NVARCHAR(100) = NULL,
    @BranchID UNIQUEIDENTIFIER = NULL,
    @Gender CHAR(1) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortColumn VARCHAR(50) = 'CreatedOn',
    @SortDirection VARCHAR(4) = 'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    -- Main query with pagination
    SELECT 
        p.PatientID,
        p.MRN,
        p.FirstName,
        p.LastName,
        p.DateOfBirth,
        DATEDIFF(YEAR, p.DateOfBirth, GETDATE()) AS Age,
        p.Gender,
        p.Phone,
        p.Email,
        p.City,
        p.State,
        b.BranchName,
        p.CreatedOn,
        p.IsActive
    FROM Patients p
    INNER JOIN Branches b ON p.BranchID = b.BranchID
    WHERE p.IsDeleted = 0
        AND (@SearchTerm IS NULL OR 
             p.MRN LIKE '%' + @SearchTerm + '%' OR
             p.FirstName LIKE '%' + @SearchTerm + '%' OR
             p.LastName LIKE '%' + @SearchTerm + '%' OR
             p.Phone LIKE '%' + @SearchTerm + '%')
        AND (@BranchID IS NULL OR p.BranchID = @BranchID)
        AND (@Gender IS NULL OR p.Gender = @Gender)
    ORDER BY 
        CASE WHEN @SortColumn = 'MRN' AND @SortDirection = 'ASC' THEN p.MRN END ASC,
        CASE WHEN @SortColumn = 'MRN' AND @SortDirection = 'DESC' THEN p.MRN END DESC,
        CASE WHEN @SortColumn = 'FirstName' AND @SortDirection = 'ASC' THEN p.FirstName END ASC,
        CASE WHEN @SortColumn = 'FirstName' AND @SortDirection = 'DESC' THEN p.FirstName END DESC,
        CASE WHEN @SortColumn = 'LastName' AND @SortDirection = 'ASC' THEN p.LastName END ASC,
        CASE WHEN @SortColumn = 'LastName' AND @SortDirection = 'DESC' THEN p.LastName END DESC,
        CASE WHEN @SortColumn = 'CreatedOn' AND @SortDirection = 'ASC' THEN p.CreatedOn END ASC,
        CASE WHEN @SortColumn = 'CreatedOn' AND @SortDirection = 'DESC' THEN p.CreatedOn END DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Total count for pagination
    SELECT COUNT(*) AS TotalCount
    FROM Patients p
    WHERE p.IsDeleted = 0
        AND (@SearchTerm IS NULL OR 
             p.MRN LIKE '%' + @SearchTerm + '%' OR
             p.FirstName LIKE '%' + @SearchTerm + '%' OR
             p.LastName LIKE '%' + @SearchTerm + '%' OR
             p.Phone LIKE '%' + @SearchTerm + '%')
        AND (@BranchID IS NULL OR p.BranchID = @BranchID)
        AND (@Gender IS NULL OR p.Gender = @Gender);
END
GO

-- =============================================================================
-- Stored Procedure: Patient Soft Delete
-- =============================================================================

CREATE PROCEDURE sp_Patient_Delete
    @PatientID UNIQUEIDENTIFIER,
    @CurrentUserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Soft delete (set IsDeleted = 1)
        UPDATE Patients
        SET IsDeleted = 1,
            ModifiedBy = @CurrentUserID,
            ModifiedOn = GETDATE()
        WHERE PatientID = @PatientID;
        
        -- Log the deletion
        INSERT INTO AuditLog (TableName, RecordID, ActionType, UserID, ActionDate, Details)
        VALUES ('Patients', @PatientID, 'DELETE', @CurrentUserID, GETDATE(), 'Patient soft deleted');
        
        RETURN 0;
        
    END TRY
    BEGIN CATCH
        RAISERROR('Failed to delete patient: %s', 16, 1, ERROR_MESSAGE());
        RETURN -99;
    END CATCH
END
GO

-- =============================================================================
-- Stored Procedure: Patient Dropdown (for lookup)
-- =============================================================================

CREATE PROCEDURE sp_Patient_Dropdown
    @BranchID UNIQUEIDENTIFIER = NULL,
    @SearchTerm NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        PatientID AS Value,
        MRN + ' - ' + FirstName + ' ' + LastName AS Label,
        MRN,
        FirstName,
        LastName
    FROM Patients
    WHERE IsDeleted = 0
        AND IsActive = 1
        AND (@BranchID IS NULL OR BranchID = @BranchID)
        AND (@SearchTerm IS NULL OR 
             MRN LIKE '%' + @SearchTerm + '%' OR
             FirstName LIKE '%' + @SearchTerm + '%' OR
             LastName LIKE '%' + @SearchTerm + '%')
    ORDER BY LastName, FirstName
    OPTION (OPTIMIZE FOR UNKNOWN);
END
GO
