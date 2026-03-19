-- =============================================================================
-- Organization Building Module - SQL Schema
-- Generated from SRS V1.7
-- Module: Organization Building (Building → Floor → Room)
-- =============================================================================

-- =============================================================================
-- 1. BUILDING TABLE
-- =============================================================================
CREATE TABLE Buildings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Code VARCHAR(50) NULL,
    Address NVARCHAR(500) NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,
    Country NVARCHAR(100) NULL,
    PostalCode VARCHAR(20) NULL,
    IsActive BIT DEFAULT 1,
    SortOrder INT DEFAULT 0,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CreatedOn DATETIME2 DEFAULT GETDATE(),
    ModifiedBy UNIQUEIDENTIFIER NULL,
    ModifiedOn DATETIME2 NULL,
    
    CONSTRAINT UQ_Buildings_Name UNIQUE (Name),
    CONSTRAINT UQ_Buildings_Code UNIQUE (Code)
);

-- Indexes for Buildings
CREATE INDEX IX_Buildings_Name ON Buildings(Name);
CREATE INDEX IX_Buildings_IsActive ON Buildings(IsActive);
CREATE INDEX IX_Buildings_CreatedOn ON Buildings(CreatedOn);

-- =============================================================================
-- 2. FLOOR TABLE
-- =============================================================================
CREATE TABLE Floors (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    BuildingId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Code VARCHAR(50) NULL,
    FloorNumber INT NULL,
    IsActive BIT DEFAULT 1,
    SortOrder INT DEFAULT 0,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CreatedOn DATETIME2 DEFAULT GETDATE(),
    ModifiedBy UNIQUEIDENTIFIER NULL,
    ModifiedOn DATETIME2 NULL,
    
    CONSTRAINT FK_Floors_Building FOREIGN KEY (BuildingId) REFERENCES Buildings(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_Floors_Building_Name UNIQUE (BuildingId, Name)
);

-- Indexes for Floors
CREATE INDEX IX_Floors_BuildingId ON Floors(BuildingId);
CREATE INDEX IX_Floors_Name ON Floors(Name);
CREATE INDEX IX_Floors_IsActive ON Floors(IsActive);

-- =============================================================================
-- 3. ROOM TABLE
-- =============================================================================
CREATE TABLE Rooms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FloorId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Code VARCHAR(50) NULL,
    RoomNumber VARCHAR(50) NULL,
    RoomType VARCHAR(50) NULL,  -- e.g., 'Office', 'Meeting Room', 'Storage', 'Restroom'
    Capacity INT NULL,
    Area DECIMAL(10,2) NULL,  -- Square meters
    IsActive BIT DEFAULT 1,
    SortOrder INT DEFAULT 0,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CreatedOn DATETIME2 DEFAULT GETDATE(),
    ModifiedBy UNIQUEIDENTIFIER NULL,
    ModifiedOn DATETIME2 NULL,
    
    CONSTRAINT FK_Rooms_Floor FOREIGN KEY (FloorId) REFERENCES Floors(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_Rooms_Floor_Name UNIQUE (FloorId, Name)
);

-- Indexes for Rooms
CREATE INDEX IX_Rooms_FloorId ON Rooms(FloorId);
CREATE INDEX IX_Rooms_Name ON Rooms(Name);
CREATE INDEX IX_Rooms_IsActive ON Rooms(IsActive);
CREATE INDEX IX_Rooms_RoomType ON Rooms(RoomType);

-- =============================================================================
-- 4. SAMPLE DATA (Optional - Uncomment to use)
-- =============================================================================
/*
-- Sample Buildings
INSERT INTO Buildings (Id, Name, Description, Code, Address, City, IsActive)
VALUES 
    (NEWID(), 'Main Hospital Building', 'Primary hospital facility', 'BLD-001', '123 Healthcare Ave', 'Dubai', 1),
    (NEWID(), 'Administrative Block', 'Admin offices and departments', 'BLD-002', '125 Healthcare Ave', 'Dubai', 1),
    (NEWID(), 'Research Center', 'Medical research facility', 'BLD-003', '127 Healthcare Ave', 'Dubai', 1);

-- Sample Floors (requires Building IDs)
INSERT INTO Floors (BuildingId, Name, FloorNumber, IsActive)
SELECT Id, 'Ground Floor', 0, 1 FROM Buildings WHERE Code = 'BLD-001'
UNION ALL
SELECT Id, 'First Floor', 1, 1 FROM Buildings WHERE Code = 'BLD-001'
UNION ALL
SELECT Id, 'Second Floor', 2, 1 FROM Buildings WHERE Code = 'BLD-001';

-- Sample Rooms (requires Floor IDs)
INSERT INTO Rooms (FloorId, Name, RoomNumber, RoomType, Capacity, IsActive)
SELECT Id, 'Reception Area', 'G-001', 'Reception', 50, 1 FROM Floors WHERE Name = 'Ground Floor'
UNION ALL
SELECT Id, 'Emergency Room', 'G-002', 'Emergency', 20, 1 FROM Floors WHERE Name = 'Ground Floor'
UNION ALL
SELECT Id, 'ICU Ward', '1-001', 'ICU', 15, 1 FROM Floors WHERE Name = 'First Floor';
*/

-- =============================================================================
-- 5. VIEWS FOR EASY QUERYING
-- =============================================================================

-- View: Building with Floor Count
CREATE VIEW vw_BuildingSummary AS
SELECT 
    b.Id,
    b.Name AS BuildingName,
    b.Description,
    b.Code AS BuildingCode,
    b.Address,
    b.City,
    b.IsActive,
    COUNT(DISTINCT f.Id) AS FloorCount,
    COUNT(r.Id) AS RoomCount
FROM Buildings b
LEFT JOIN Floors f ON b.Id = f.BuildingId
LEFT JOIN Rooms r ON f.Id = r.FloorId
GROUP BY b.Id, b.Name, b.Description, b.Code, b.Address, b.City, b.IsActive;

-- View: Floor with Room Count
CREATE VIEW vw_FloorSummary AS
SELECT 
    f.Id,
    f.Name AS FloorName,
    f.FloorNumber,
    b.Name AS BuildingName,
    b.Code AS BuildingCode,
    f.IsActive,
    COUNT(r.Id) AS RoomCount
FROM Floors f
INNER JOIN Buildings b ON f.BuildingId = b.Id
LEFT JOIN Rooms r ON f.Id = r.FloorId
GROUP BY f.Id, f.Name, f.FloorNumber, b.Name, b.Code, f.IsActive;

-- View: Complete Room Hierarchy
CREATE VIEW vw_RoomHierarchy AS
SELECT 
    r.Id,
    r.Name AS RoomName,
    r.RoomNumber,
    r.RoomType,
    r.Capacity,
    f.Name AS FloorName,
    f.FloorNumber,
    b.Name AS BuildingName,
    b.Code AS BuildingCode,
    r.IsActive
FROM Rooms r
INNER JOIN Floors f ON r.FloorId = f.Id
INNER JOIN Buildings b ON f.BuildingId = b.Id;

-- =============================================================================
-- 6. STORED PROCEDURES
-- =============================================================================

-- Get Building by ID with Statistics
CREATE PROCEDURE sp_GetBuildingById
    @BuildingId UNIQUEIDENTIFIER
AS
BEGIN
    SELECT 
        b.*,
        (SELECT COUNT(*) FROM Floors WHERE BuildingId = b.Id) AS FloorCount,
        (SELECT COUNT(*) FROM Rooms r 
         INNER JOIN Floors f ON r.FloorId = f.Id 
         WHERE f.BuildingId = b.Id) AS RoomCount
    FROM Buildings b
    WHERE b.Id = @BuildingId;
END;
GO

-- Get Floors by Building
CREATE PROCEDURE sp_GetFloorsByBuilding
    @BuildingId UNIQUEIDENTIFIER
AS
BEGIN
    SELECT 
        f.*,
        (SELECT COUNT(*) FROM Rooms WHERE FloorId = f.Id) AS RoomCount
    FROM Floors f
    WHERE f.BuildingId = @BuildingId
    ORDER BY f.FloorNumber, f.SortOrder, f.Name;
END;
GO

-- Get Rooms by Floor
CREATE PROCEDURE sp_GetRoomsByFloor
    @FloorId UNIQUEIDENTIFIER
AS
BEGIN
    SELECT * FROM Rooms
    WHERE FloorId = @FloorId
    ORDER BY SortOrder, RoomNumber, Name;
END;
GO

-- Search Buildings
CREATE PROCEDURE sp_SearchBuildings
    @SearchTerm NVARCHAR(200)
AS
BEGIN
    SELECT * FROM Buildings
    WHERE Name LIKE '%' + @SearchTerm + '%'
       OR Description LIKE '%' + @SearchTerm + '%'
       OR Code LIKE '%' + @SearchTerm + '%'
    ORDER BY Name;
END;
GO

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
