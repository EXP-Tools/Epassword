const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generatePassword } = require('../electron/generator.cjs');

test('生成的密码包含每种选定字符，排除未选字符', () => {
  for (let mask = 1; mask < 16; mask++) {
    const keys = ['uppercase', 'lowercase', 'digits', 'symbols'];
    const patterns = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/];
    const options = {type:'random', length:24};
    keys.forEach((key, index) => options[key] = Boolean(mask & (1 << index)));
    for (let count = 0; count < 20; count++) {
      const value = generatePassword(options);
      assert.equal(value.length, 24);
      patterns.forEach((pattern, index) => assert.equal(pattern.test(value), options[keys[index]]));
    }
  }
});

test('PIN 是指定长度的数字字符串，支持四位与边界长度', () => {
  for (const length of [4, 6, 8, 32]) {
    const value = generatePassword({type:'pin', length});
    assert.equal(typeof value, 'string');
    assert.match(value, new RegExp(`^[0-9]{${length}}$`));
  }
});

test('拒绝空字符集、未知类型和无效长度', () => {
  for (const options of [null, 24, {type:'other',length:24}, {type:'random',length:24},
    ...[3,33,4.5,NaN,'6'].map(length=>({type:'pin',length})),
    ...[7,65].map(length=>({type:'random',length,lowercase:true}))]) {
    assert.throws(() => generatePassword(options));
  }
});
