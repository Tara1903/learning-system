const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match things like .eq('foo_bar', ...) or .in('foo_bar', ...) or .order('foo_bar') or upsert({ foo_bar: ... })
  const matches = content.match(/['"]\w+_\w+['"]|\b\w+_\w+\s*:/g);
  if (matches) {
    // Filter out common false positives like process.env variables, SQL files
    const relevant = matches.filter(m => !m.toUpperCase().includes(m) && !m.includes('NEW.') && !m.startsWith('api_') && !m.includes('learning_system') && !m.includes('update_modified_column') && !m.includes('get_institute_analytics'));
    if (relevant.length > 0) {
      console.log(file, relevant.join(', '));
    }
  }
});
