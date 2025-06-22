-- Initial schema migration
-- Create tables for activities, sessions, checkboxes, and goals

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    type VARCHAR(20) NOT NULL CHECK (type IN ('time-tracking', 'checkbox')),
    reset_period VARCHAR(20) CHECK (reset_period IN ('daily', 'weekly', 'monthly')),
    goal_type VARCHAR(20) CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
    target_minutes INTEGER,
    goal_is_active BOOLEAN
);

-- Activity sessions table
CREATE TABLE IF NOT EXISTS activity_sessions (
    id UUID PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    date DATE NOT NULL,
    notes TEXT,
    is_running BOOLEAN NOT NULL DEFAULT false
);

-- Daily checkboxes table
CREATE TABLE IF NOT EXISTS daily_checkboxes (
    id UUID PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    UNIQUE(activity_id, date)
);

-- Goals table (legacy support)
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
    target_minutes INTEGER NOT NULL,
    start_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_sessions_activity_id ON activity_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_date ON activity_sessions(date);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_is_running ON activity_sessions(is_running);
CREATE INDEX IF NOT EXISTS idx_daily_checkboxes_activity_id ON daily_checkboxes(activity_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkboxes_date ON daily_checkboxes(date);
CREATE INDEX IF NOT EXISTS idx_goals_activity_id ON goals(activity_id);
