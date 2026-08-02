const fs = require('fs');
let content = fs.readFileSync('supabase_schema.sql', 'utf8');

// Strip quotes from index and trigger names
content = content.replace(/(idx_[a-zA-Z0-9_\"']+)/g, match => match.replace(/"/g, ''));
content = content.replace(/(update_[a-zA-Z0-9_\"']+)/g, match => match.replace(/"/g, ''));

fs.writeFileSync('supabase_schema.sql', content);
console.log('Quotes stripped from identifiers');
