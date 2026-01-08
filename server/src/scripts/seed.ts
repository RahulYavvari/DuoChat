import 'dotenv/config';
import { db } from '../config/database.config.js';

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS message_log CASCADE;
DROP TABLE IF EXISTS active_chats CASCADE;
DROP TABLE IF EXISTS waiting_queue CASCADE;
DROP TABLE IF EXISTS connections CASCADE;

CREATE TABLE connections (
    connection_id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE',
    matched_with VARCHAR(255),
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_status CHECK (status IN ('IDLE', 'SEARCHING', 'CHATTING'))
);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_last_activity ON connections(last_activity);

CREATE TABLE waiting_queue (
    user_id UUID PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_waiting_queue_user 
        FOREIGN KEY (user_id) 
        REFERENCES connections(user_id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_waiting_queue_joined_at ON waiting_queue(joined_at ASC);

CREATE TABLE active_chats (
    chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    user1_connection_id VARCHAR(255) NOT NULL,
    user2_connection_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    
    CONSTRAINT fk_active_chats_user1 
        FOREIGN KEY (user1_id) 
        REFERENCES connections(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_active_chats_user2 
        FOREIGN KEY (user2_id) 
        REFERENCES connections(user_id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_active_chats_user1 ON active_chats(user1_id);
CREATE INDEX idx_active_chats_user2 ON active_chats(user2_id);

CREATE TABLE message_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    message_length INTEGER NOT NULL,
    
    CONSTRAINT fk_message_log_user 
        FOREIGN KEY (user_id) 
        REFERENCES connections(user_id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_message_log_user_time ON message_log(user_id, sent_at DESC);

CREATE OR REPLACE FUNCTION attempt_match(
    p_user_id UUID,
    p_connection_id VARCHAR(255)
)
RETURNS TABLE(
    matched BOOLEAN,
    partner_user_id UUID,
    partner_connection_id VARCHAR(255),
    chat_id UUID
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner RECORD;
    v_chat_id UUID;
BEGIN
    SELECT 
        wq.user_id, 
        wq.connection_id 
    INTO v_partner
    FROM waiting_queue wq
    WHERE wq.user_id != p_user_id
    ORDER BY wq.joined_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;
    
    IF FOUND THEN
        v_chat_id := uuid_generate_v4();
        
        INSERT INTO active_chats (
            chat_id, 
            user1_id, 
            user2_id, 
            user1_connection_id, 
            user2_connection_id,
            started_at
        ) VALUES (
            v_chat_id,
            p_user_id,
            v_partner.user_id,
            p_connection_id,
            v_partner.connection_id,
            NOW()
        );
        
        UPDATE connections 
        SET 
            status = 'CHATTING', 
            matched_with = v_partner.connection_id,
            last_activity = NOW()
        WHERE user_id = p_user_id;
        
        UPDATE connections 
        SET 
            status = 'CHATTING', 
            matched_with = p_connection_id,
            last_activity = NOW()
        WHERE user_id = v_partner.user_id;
        
        DELETE FROM waiting_queue 
        WHERE user_id = v_partner.user_id;
        
        RETURN QUERY 
        SELECT 
            TRUE, 
            v_partner.user_id, 
            v_partner.connection_id,
            v_chat_id;
    ELSE
        INSERT INTO waiting_queue (user_id, connection_id, joined_at)
        VALUES (p_user_id, p_connection_id, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            connection_id = EXCLUDED.connection_id,
            joined_at = NOW();
        
        UPDATE connections 
        SET 
            status = 'SEARCHING',
            last_activity = NOW()
        WHERE user_id = p_user_id;
        
        RETURN QUERY 
        SELECT 
            FALSE, 
            NULL::UUID, 
            NULL::VARCHAR,
            NULL::UUID;
    END IF;
END;
$$;
`;

export async function seedDatabase() {
  console.log('Starting database seeding...');
  console.log('Database URL:', process.env.DATABASE_URL?.split('@')[1] || 'NOT SET');
  
  const client = await db.connect();
  
  try {
    console.log('Database connected');
    console.log('Running schema...');
    
    await client.query(schema);
    
    console.log('Schema executed successfully');
    console.log('Tables created: connections, waiting_queue, active_chats, message_log');
    console.log('Function created: attempt_match');
    console.log('Database seeding complete!');
    
  } catch (error: any) {
    console.error('Database seeding failed');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

seedDatabase()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });