const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const env = {...process.env};
  delete env.ELECTRON_RUN_AS_NODE;
  const profile = path.resolve('test-results', `profile-${Date.now()}`);
  const app = await electron.launch({args:['.', `--user-data-dir=${profile}`], env,
    ...(process.env.EPASSWORD_TEST_RUNTIME ? {executablePath:process.env.EPASSWORD_TEST_RUNTIME} : {})});
  try {
    const page = await app.firstWindow();
    const file = path.resolve('test-results', `copy-generator-${Date.now()}.xlsx`);
    await fs.mkdir(path.dirname(file), {recursive:true});
    await page.waitForSelector('#master');
    await page.evaluate(async file => {
      const result = await window.epassword.call('unlock', {mode:'create',path:file,password:'Desktop-test-123!'});
      state.items=result.items;state.path=file;render();
    }, file);
    await page.locator('#new').click();
    await page.locator('[name=title]').fill('复制与生成测试');
    await page.locator('[name=username]').fill('click@example.com');
    await page.locator('#generator-type').selectOption('pin');
    await expect(page.locator('#length')).toHaveValue('6');
    await expect(page.locator('#character-options')).toBeHidden();
    await page.locator('#length').fill('4');
    await page.locator('#generate').click();
    await expect(page.locator('[name=password]')).toHaveValue(/^\d{4}$/);
    await page.locator('#generator-type').selectOption('random');
    await expect(page.locator('#length')).toHaveValue('24');
    await page.locator('#gen-symbols').uncheck();
    await page.locator('#generate').click();
    await expect(page.locator('[name=password]')).toHaveValue(/^[A-Za-z0-9]{24}$/);
    const random = await page.locator('[name=password]').inputValue();
    assert.match(random, /[A-Z]/);assert.match(random, /[a-z]/);assert.match(random, /\d/);
    for (const key of ['uppercase','lowercase','digits']) await page.locator('#gen-'+key).uncheck();
    await page.locator('#generate').click();
    await expect(page.locator('#toast')).toHaveText('请至少选择一种字符');
    await expect(page.locator('[name=password]')).toHaveValue(random);
    await page.locator('#generator-type').selectOption('pin');
    await expect(page.locator('#length')).toHaveValue('4');
    await page.screenshot({path:'test-results/generator.png'});
    // A leading-zero PIN must stay a string through save, copy, and Excel persistence.
    await page.locator('[name=password]').fill('001234');
    await page.locator('#editor [type=submit]').click();
    await page.locator('h1').filter({hasText:'复制与生成测试'}).waitFor();
    const clipboardText = () => app.evaluate(({clipboard}) => clipboard.readText());
    await page.locator('.field-data[data-copy=username]').click();
    await expect.poll(clipboardText).toBe('click@example.com');
    await page.locator('#password-value').click();
    await expect.poll(clipboardText).toBe('001234');
    await expect(page.locator('#password-value')).toHaveText('••••••••••••');
    await page.locator('.field-data[data-copy=username]').focus();
    await page.keyboard.press('Enter');
    await expect.poll(clipboardText).toBe('click@example.com');
    await page.locator('#show').click();
    assert.equal(await clipboardText(), 'click@example.com');
    await expect(page.locator('#password-value')).toHaveText('001234');
    await page.locator('#password-value').click();
    await expect.poll(clipboardText).toBe('001234');
    await page.locator('#lock').click();
    await expect.poll(clipboardText).toBe('');
    const {decode}=require('../electron/vault.cjs');
    const items=await decode(await fs.readFile(file),'Desktop-test-123!');
    assert.equal(items[0].password,'001234');
    console.log('PASS: click and keyboard copy, masked copy, reveal isolation, PIN modes, character options, validation, leading-zero Excel persistence, lock cleanup');
  } finally { await app.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
