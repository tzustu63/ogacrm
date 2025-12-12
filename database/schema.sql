-- 招生CRM系統資料庫架構
-- Recruitment CRM System Database Schema

-- 建立UUID擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 學校類型枚舉
CREATE TYPE school_type AS ENUM ('high_school', 'university', 'vocational', 'other');

-- 關係狀態枚舉
CREATE TYPE relationship_status AS ENUM ('potential', 'active', 'partnered', 'paused');

-- 聯繫方式枚舉
CREATE TYPE contact_method AS ENUM ('email', 'phone', 'visit', 'video_call', 'other');

-- MOU狀態枚舉
CREATE TYPE mou_status AS ENUM ('none', 'negotiating', 'signed', 'expired');

-- 學校表
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    school_type school_type NOT NULL,
    website VARCHAR(500),
    relationship_status relationship_status DEFAULT 'potential',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 聯絡人表
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 互動記錄表
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    contact_method contact_method NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT NOT NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 合作資訊表
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    mou_status mou_status DEFAULT 'none',
    mou_signed_date DATE,
    mou_expiry_date DATE,
    referral_count INTEGER DEFAULT 0,
    events_held INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 偏好設定表
CREATE TABLE preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    preferred_contact_method contact_method NOT NULL,
    programs_of_interest TEXT[] NOT NULL,
    best_contact_time VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    special_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_schools_name ON schools(name);
CREATE INDEX idx_schools_country ON schools(country);
CREATE INDEX idx_schools_region ON schools(region);
CREATE INDEX idx_schools_type ON schools(school_type);
CREATE INDEX idx_schools_status ON schools(relationship_status);

CREATE INDEX idx_contacts_school_id ON contacts(school_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_primary ON contacts(is_primary);

CREATE INDEX idx_interactions_school_id ON interactions(school_id);
CREATE INDEX idx_interactions_date ON interactions(date);
CREATE INDEX idx_interactions_method ON interactions(contact_method);

CREATE INDEX idx_partnerships_school_id ON partnerships(school_id);
CREATE INDEX idx_partnerships_mou_status ON partnerships(mou_status);
CREATE INDEX idx_partnerships_expiry ON partnerships(mou_expiry_date);

CREATE INDEX idx_preferences_school_id ON preferences(school_id);

-- 觸發器函數：更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表添加觸發器
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnerships_updated_at BEFORE UPDATE ON partnerships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 約束條件
ALTER TABLE contacts ADD CONSTRAINT unique_primary_contact_per_school 
    EXCLUDE (school_id WITH =) WHERE (is_primary = true);

ALTER TABLE partnerships ADD CONSTRAINT unique_partnership_per_school 
    UNIQUE (school_id);

ALTER TABLE preferences ADD CONSTRAINT unique_preference_per_school 
    UNIQUE (school_id);

-- 檢查約束
ALTER TABLE partnerships ADD CONSTRAINT check_mou_dates 
    CHECK (mou_signed_date IS NULL OR mou_expiry_date IS NULL OR mou_signed_date <= mou_expiry_date);

ALTER TABLE partnerships ADD CONSTRAINT check_referral_count 
    CHECK (referral_count >= 0);

ALTER TABLE partnerships ADD CONSTRAINT check_events_held 
    CHECK (events_held >= 0);

-- 註釋
COMMENT ON TABLE schools IS '學校基本資訊表';
COMMENT ON TABLE contacts IS '學校聯絡人資訊表';
COMMENT ON TABLE interactions IS '互動記錄表';
COMMENT ON TABLE partnerships IS '合作夥伴關係表';
COMMENT ON TABLE preferences IS '學校偏好設定表';