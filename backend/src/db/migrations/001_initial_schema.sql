-- RideGo PostGIS Initial Schema Migration
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'RIDER' CHECK (role IN ('RIDER', 'DRIVER', 'BOTH')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Profiles Table
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'AUTO', 'CAB')),
    vehicle_number VARCHAR(30) NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    is_busy BOOLEAN DEFAULT FALSE,
    current_location GEOGRAPHY(Point, 4326),
    heading NUMERIC(5, 2) DEFAULT 0.0,
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial Index for Fast Nearest Driver Radial Queries
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location 
ON driver_profiles USING GIST (current_location);

-- Rides Table
DO $$ BEGIN
    CREATE TYPE ride_status AS ENUM (
        'REQUESTED',
        'MATCHING',
        'DRIVER_ASSIGNED',
        'DRIVER_ARRIVING',
        'ARRIVED_PICKUP',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'AUTO', 'CAB')),
    status ride_status DEFAULT 'REQUESTED',
    
    pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    drop_location GEOGRAPHY(Point, 4326) NOT NULL,
    drop_address TEXT NOT NULL,
    
    canonical_distance_km NUMERIC(6, 2) NOT NULL,
    canonical_duration_mins INT NOT NULL,
    locked_fare NUMERIC(8, 2) NOT NULL,
    
    ride_otp VARCHAR(4) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'UPI')),
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID')),
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);

-- Saved Places Table
CREATE TABLE IF NOT EXISTS saved_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
