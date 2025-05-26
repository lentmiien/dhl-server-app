-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  hash VARCHAR(255) NOT NULL,
  role ENUM('GCS', 'Logistics', 'Admin') DEFAULT 'GCS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Uploads table
CREATE TABLE uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uploaded_by INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  status ENUM('PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PROCESSING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upload rows table
CREATE TABLE upload_rows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  upload_id INT NOT NULL,
  row_number INT NOT NULL,
  raw_json JSON NOT NULL,
  recipient_name VARCHAR(255),
  street VARCHAR(500),
  city VARCHAR(255),
  postal_code VARCHAR(20),
  country VARCHAR(10),
  phone VARCHAR(50),
  weight DECIMAL(10,2) DEFAULT 1.00,
  status ENUM('NEW', 'VALIDATED', 'ERROR', 'LABELED', 'LABEL_ERROR') DEFAULT 'NEW',
  error_msg TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_upload_id (upload_id),
  INDEX idx_status (status),
  INDEX idx_upload_row (upload_id, row_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shipments table
CREATE TABLE shipments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  upload_id INT,
  upload_row_id INT,
  dhl_ref VARCHAR(100),
  tracking_number VARCHAR(100),
  label_url VARCHAR(500),
  recipient_name VARCHAR(255) NOT NULL,
  address_json JSON NOT NULL,
  status ENUM('PENDING', 'LABELED', 'SHIPPED', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
  estimated_delivery TIMESTAMP NULL,
  cost_amount DECIMAL(10,2),
  cost_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (upload_id) REFERENCES uploads(id),
  FOREIGN KEY (upload_row_id) REFERENCES upload_rows(id),
  INDEX idx_upload_id (upload_id),
  INDEX idx_dhl_ref (dhl_ref),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Temporary labels table
CREATE TABLE temp_labels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shipment_id INT NOT NULL,
  pdf_blob LONGBLOB,
  s3_key VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- App settings table
CREATE TABLE app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit logs table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  meta_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Error logs table
CREATE TABLE error_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  meta_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level (level),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin user (password: admin123)
INSERT INTO users (email, hash, role) VALUES 
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewPlr10rrNB.3Qa2', 'Admin');
