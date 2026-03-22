import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log("Creating group_roadmaps table...");
  const { error } = await supabase.rpc('run_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS group_roadmaps (
        group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
        roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (group_id, roadmap_id)
      );

      -- Enable RLS
      ALTER TABLE group_roadmaps ENABLE ROW LEVEL SECURITY;

      -- Policies for group members
      CREATE POLICY "group_roadmaps_member_read" ON group_roadmaps
        FOR SELECT USING (
          group_id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
        );

      -- Policies for group admins
      CREATE POLICY "group_roadmaps_admin_all" ON group_roadmaps
        FOR ALL USING (
          group_id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()) AND role = 'admin')
        );
    `
  });

  if (error) {
    // If rpc run_sql doesn't exist, we might need another way or just skip if table exists
    console.error("Migration failed:", error);
    console.log("Attempting direct table check...");

    // Fallback: check if we can just create it via query if allowed
    const { error: queryError } = await supabase.from('group_roadmaps').select('count').limit(1);
    if (queryError) {
      console.log("Table doesn't exist, please run the SQL in Supabase dashboard:");
      console.log(`
        CREATE TABLE IF NOT EXISTS group_roadmaps (
          group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
          roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (group_id, roadmap_id)
        );
      `);
    } else {
      console.log("Table already exists.");
    }
  } else {
    console.log("Table created successfully via RPC.");
  }
}

migrate();
