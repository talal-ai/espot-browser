-- Add expires_at column to user_services table
ALter TABLE user_services 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
