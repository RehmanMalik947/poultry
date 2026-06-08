-- Add appointment workflow columns (booking, check-in, check-out, service duration).
-- Run once against your database if the table already exists.
-- MySQL: run from backend folder: mysql -u <user> -p <dbname> < sql/add-appointment-workflow-columns.sql

ALTER TABLE appointments
  ADD COLUMN booking_time DATETIME NULL COMMENT 'When the appointment was booked' AFTER notes,
  ADD COLUMN check_in_time DATETIME NULL COMMENT 'When the client checked in' AFTER booking_time,
  ADD COLUMN check_out_time DATETIME NULL COMMENT 'When the client checked out' AFTER check_in_time,
  ADD COLUMN service_duration INT NULL COMMENT 'Service duration in minutes' AFTER check_out_time;
