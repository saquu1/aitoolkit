-- =============================================================================
-- HIS Hospital Information System - Database Schema
-- =============================================================================
-- Module: Patient Management
-- Generated: 2024-01-15
-- =============================================================================

-- Patient Master Table
CREATE TABLE Patients (
    PatientID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MRN VARCHAR(20) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Gender CHAR(1) NOT NULL CHECK (Gender IN ('M', 'F', 'O')),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(50),
    ZipCode VARCHAR(20),
    Country NVARCHAR(50) DEFAULT 'USA',
    BranchID UNIQUEIDENTIFIER NOT NULL,
    IsActive BIT DEFAULT 1,
    IsDeleted BIT DEFAULT 0,
    CreatedBy UNIQUEIDENTIFIER,
    CreatedOn DATETIME DEFAULT GETDATE(),
    ModifiedBy UNIQUEIDENTIFIER,
    ModifiedOn DATETIME,
    CONSTRAINT FK_Patients_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)
);

-- Create indexes for performance
CREATE INDEX IX_Patients_MRN ON Patients(MRN);
CREATE INDEX IX_Patients_BranchID ON Patients(BranchID);
CREATE INDEX IX_Patients_IsDeleted ON Patients(IsDeleted);

-- Visits Table
CREATE TABLE Visits (
    VisitID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientID UNIQUEIDENTIFIER NOT NULL,
    DoctorID UNIQUEIDENTIFIER,
    VisitDate DATETIME NOT NULL,
    VisitType VARCHAR(20) NOT NULL CHECK (VisitType IN ('OPD', 'IPD', 'EMERGENCY', 'DAYCARE')),
    Status VARCHAR(20) DEFAULT 'Scheduled' CHECK (Status IN ('Scheduled', 'InProgress', 'Completed', 'Cancelled')),
    ChiefComplaint NVARCHAR(MAX),
    Diagnosis NVARCHAR(MAX),
    Notes NVARCHAR(MAX),
    BranchID UNIQUEIDENTIFIER NOT NULL,
    CreatedBy UNIQUEIDENTIFIER,
    CreatedOn DATETIME DEFAULT GETDATE(),
    ModifiedBy UNIQUEIDENTIFIER,
    ModifiedOn DATETIME,
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_Visits_Patient FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_Visits_Doctor FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT FK_Visits_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)
);

-- Create indexes for Visits
CREATE INDEX IX_Visits_PatientID ON Visits(PatientID);
CREATE INDEX IX_Visits_DoctorID ON Visits(DoctorID);
CREATE INDEX IX_Visits_VisitDate ON Visits(VisitDate);
CREATE INDEX IX_Visits_Status ON Visits(Status);

-- Prescriptions Table
CREATE TABLE Prescriptions (
    PrescriptionID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    VisitID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    DoctorID UNIQUEIDENTIFIER NOT NULL,
    PrescriptionDate DATETIME DEFAULT GETDATE(),
    Status VARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Dispensed', 'PartiallyDispensed', 'Cancelled')),
    Notes NVARCHAR(MAX),
    CreatedBy UNIQUEIDENTIFIER,
    CreatedOn DATETIME DEFAULT GETDATE(),
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_Prescriptions_Visit FOREIGN KEY (VisitID) REFERENCES Visits(VisitID),
    CONSTRAINT FK_Prescriptions_Patient FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_Prescriptions_Doctor FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

-- Lab Orders Table
CREATE TABLE LabOrders (
    LabOrderID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    VisitID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    DoctorID UNIQUEIDENTIFIER NOT NULL,
    OrderDate DATETIME DEFAULT GETDATE(),
    Status VARCHAR(20) DEFAULT 'Ordered' CHECK (Status IN ('Ordered', 'Collected', 'InProgress', 'Completed', 'Cancelled')),
    Priority VARCHAR(20) DEFAULT 'Routine' CHECK (Priority IN ('Routine', 'Urgent', 'STAT')),
    Notes NVARCHAR(MAX),
    CreatedBy UNIQUEIDENTIFIER,
    CreatedOn DATETIME DEFAULT GETDATE(),
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_LabOrders_Visit FOREIGN KEY (VisitID) REFERENCES Visits(VisitID),
    CONSTRAINT FK_LabOrders_Patient FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_LabOrders_Doctor FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

-- Branches Table (Master)
CREATE TABLE Branches (
    BranchID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    BranchCode VARCHAR(20) NOT NULL UNIQUE,
    BranchName NVARCHAR(200) NOT NULL,
    Address NVARCHAR(500),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    IsActive BIT DEFAULT 1,
    CreatedOn DATETIME DEFAULT GETDATE()
);

-- Doctors Table
CREATE TABLE Doctors (
    DoctorID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DoctorCode VARCHAR(20) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Specialization NVARCHAR(100),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    BranchID UNIQUEIDENTIFIER,
    IsActive BIT DEFAULT 1,
    CreatedOn DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Doctors_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)
);
