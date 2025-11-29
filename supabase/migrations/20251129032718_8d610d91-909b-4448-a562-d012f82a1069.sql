-- Add is_sponsored column to web_results table
ALTER TABLE web_results 
ADD COLUMN is_sponsored boolean DEFAULT false;