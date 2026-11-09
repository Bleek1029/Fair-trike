const fs = require('fs');
const path = 'src/auth/AuthContext.jsx';
let src = fs.readFileSync(path, 'utf8');
const old = `  const login = (token, userData, { remember = true } = {}) => {
    setToken(token, { remember });
    setStoredUser(userData);
    setUser(userData);
  };`;
const neu = `  const login = (token, userData, { remember = true } = {}) => {
    setToken(token, { remember });
    setStoredUser(userData);
    setUser(userData);
    setLoading(false);
  };`;
if (src.includes(old)) {
  fs.writeFileSync(path, src.replace(old, neu), 'utf8');
  console.log('PATCHED src/auth/AuthContext.jsx');
} else {
  console.log('NOT FOUND');
}
