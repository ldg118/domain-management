-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user'
);

-- 注册商表
CREATE TABLE IF NOT EXISTS registrars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  contact TEXT,
  website TEXT,
  api_url TEXT,
  api_key TEXT,
  support_email TEXT,
  memo TEXT
);

-- 域名表
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  registrar_id INTEGER,
  expiry_date TEXT NOT NULL,
  memo TEXT,
  user_id INTEGER NOT NULL,
  remind_days INTEGER DEFAULT 7,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (registrar_id) REFERENCES registrars(id)
);

-- SSL证书表
CREATE TABLE IF NOT EXISTS ssl_certs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL,
  cert TEXT NOT NULL,
  key TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  memo TEXT,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);
