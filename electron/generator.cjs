const { randomInt } = require('node:crypto');

const alphabets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?'
};

function generatePassword(options) {
  if (!options || typeof options !== 'object') throw Error('请选择密码类型和长度');
  const { type, length } = options;
  if (!['random', 'pin'].includes(type)) throw Error('不支持的密码类型');
  const min = type === 'pin' ? 4 : 8;
  const max = type === 'pin' ? 32 : 64;
  if (!Number.isInteger(length) || length < min || length > max) {
    throw Error(`长度必须为 ${min}–${max}`);
  }
  if (type === 'pin') {
    return Array.from({ length }, () => String(randomInt(10))).join('');
  }
  const groups = Object.keys(alphabets).filter(key => options[key] === true).map(key => alphabets[key]);
  if (!groups.length) throw Error('请至少选择一种字符');
  const pool = groups.join('');
  // Rejection sampling keeps the distribution uniform while requiring every selected group.
  let result;
  do {
    result = Array.from({ length }, () => pool[randomInt(pool.length)]).join('');
  } while (!groups.every(group => [...result].some(char => group.includes(char))));
  return result;
}

module.exports = { generatePassword };
