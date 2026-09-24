import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const SHOT_DIR = path.join(process.cwd(), 'screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name} — ${detail}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function createTaskViaUi(page, url) {
  await page.goto(BASE + '/');
  await page.getByPlaceholder('粘贴视频或图片链接，或将链接拖拽到此处').fill(url);
  await page.getByRole('button', { name: /解析链接/ }).click();
  await page.getByRole('button', { name: /加入下载队列/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /加入下载队列/ }).click();
  await page.waitForURL(/\/tasks/, { timeout: 5000 });
}

async function taskStatusBadge(page, text) {
  return page.getByText(text, { exact: true }).first();
}

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  try {
    // 1. 首页正常打开
    try {
      await page.goto(BASE + '/');
      await page.getByRole('heading', { name: '在线视频下载管理器' }).waitFor();
      const sub = await page.getByText('统一管理你的在线视频与图片下载任务').isVisible();
      assert(sub, '副标题未显示');
      await screenshot(page, '01-home');
      record('首页正常打开', true);
    } catch (e) {
      record('首页正常打开', false, e.message);
    }

    // 2. URL 输入正常
    try {
      const input = page.getByPlaceholder('粘贴视频或图片链接，或将链接拖拽到此处');
      await input.fill('sim://3@30');
      assert((await input.inputValue()) === 'sim://3@30', '输入框内容不匹配');
      record('URL 输入正常', true);
    } catch (e) {
      record('URL 输入正常', false, e.message);
    }

    // 3. URL 校验正常（无效格式）
    try {
      await page.goto(BASE + '/');
      const input = page.getByPlaceholder('粘贴视频或图片链接，或将链接拖拽到此处');
      await input.fill('not-a-valid-url');
      await page.getByRole('button', { name: /解析链接/ }).click();
      await page.getByText('URL 格式错误，请输入有效的视频或图片链接').waitFor();
      record('URL 校验正常', true);
    } catch (e) {
      record('URL 校验正常', false, e.message);
    }

    // 4. 平台识别正常（不支持的平台）
    try {
      await page.goto(BASE + '/');
      const input = page.getByPlaceholder('粘贴视频或图片链接，或将链接拖拽到此处');
      await input.fill('https://example.com/video/123');
      await page.getByRole('button', { name: /解析链接/ }).click();
      await page.getByText('当前平台不支持').waitFor();
      record('平台识别正常', true);
    } catch (e) {
      record('平台识别正常', false, e.message);
    }

    // 4.5 质量选项：2K（1440p）可选，且源清晰度不足时给出放大提示
    try {
      await page.goto(BASE + '/');
      const input = page.getByPlaceholder('粘贴视频或图片链接，或将链接拖拽到此处');
      await input.fill('sim://3@5');
      await page.getByRole('button', { name: /解析链接/ }).click();
      await page.getByRole('button', { name: /加入下载队列/ }).waitFor({ timeout: 10000 });

      const quality = page.getByLabel('视频质量');
      const options = await quality.locator('option').allTextContents();
      assert(options.includes('1440p（2K）'), `质量选项缺少 1440p（2K）：${options.join(' / ')}`);
      assert(options.includes('2160p（4K）'), `质量选项缺少 2160p（4K）：${options.join(' / ')}`);

      // 模拟源最高 1080p，选择 1440p 应出现放大提示
      await quality.selectOption('1440p');
      await page.getByText('源清晰度不足，将自动放大到目标清晰度').waitFor({ timeout: 5000 });
      await screenshot(page, '04b-quality-2k');
      record('2K 质量选项与放大提示', true);
    } catch (e) {
      record('2K 质量选项与放大提示', false, e.message);
    }

    // 5. 任务创建 + 6. 下载队列 + 7. 进度
    try {
      await createTaskViaUi(page, 'sim://5@40');
      await page.getByText('下载中', { exact: true }).first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(2500);
      // 进度条 + 速度/剩余 文本
      const hasSpeed = await page.getByText(/速度/).first().isVisible().catch(() => false);
      const hasEta = await page.getByText(/剩余/).first().isVisible().catch(() => false);
      assert(hasSpeed && hasEta, '未显示速度/剩余时间');
      await screenshot(page, '07-downloading');
      record('任务创建 / 下载队列 / 进度', true);
    } catch (e) {
      record('任务创建 / 下载队列 / 进度', false, e.message);
    }

    // 8. 暂停
    try {
      await page.getByRole('button', { name: /暂停/ }).first().click();
      await page.getByText('已暂停', { exact: true }).first().waitFor();
      await screenshot(page, '08-paused');
      record('暂停正常', true);
    } catch (e) {
      record('暂停正常', false, e.message);
    }

    // 9. 继续
    try {
      await page.getByRole('button', { name: /继续/ }).first().click();
      await page.getByText('下载中', { exact: true }).first().waitFor();
      record('继续正常', true);
    } catch (e) {
      record('继续正常', false, e.message);
    }

    // 10. 取消
    try {
      await page.getByRole('button', { name: /取消/ }).first().click();
      await page.getByText('已取消', { exact: true }).first().waitFor();
      record('取消正常', true);
    } catch (e) {
      record('取消正常', false, e.message);
    }

    // 11. 重试
    try {
      await page.getByRole('button', { name: /重试/ }).first().click();
      await page.getByText('下载中', { exact: true }).first().waitFor();
      // 再次取消，保持整洁
      await page.getByRole('button', { name: /取消/ }).first().click();
      await page.getByText('已取消', { exact: true }).first().waitFor();
      record('重试正常', true);
    } catch (e) {
      record('重试正常', false, e.message);
    }

    // 12. 历史记录（先完成一个任务）
    try {
      await createTaskViaUi(page, 'sim://1@3');
      await page.getByText('已完成', { exact: true }).first().waitFor({ timeout: 12000 });
      await page.goto(BASE + '/history');
      await page.getByRole('heading', { name: '下载历史' }).waitFor();
      await page.getByText('模拟测试视频').first().waitFor({ timeout: 8000 });
      await screenshot(page, '12-history');
      record('历史记录正常', true);
    } catch (e) {
      record('历史记录正常', false, e.message);
    }

    // 13. Dashboard 数据
    try {
      await page.goto(BASE + '/dashboard');
      await page.getByRole('heading', { name: '数据统计' }).waitFor();
      for (const label of ['今日任务', '已完成', '累计任务']) {
        assert(await page.getByText(label, { exact: true }).first().isVisible(), `缺少统计卡片 ${label}`);
      }
      await screenshot(page, '13-dashboard');
      record('Dashboard 数据正常', true);
    } catch (e) {
      record('Dashboard 数据正常', false, e.message);
    }

    // 14. Settings
    try {
      await page.goto(BASE + '/settings');
      await page.getByRole('heading', { name: '设置', exact: true }).waitFor();
      assert(await page.getByText('下载设置', { exact: true }).isVisible(), '缺少下载设置');
      assert(await page.getByText('网络设置', { exact: true }).isVisible(), '缺少网络设置');
      assert(await page.getByText('当前版本', { exact: true }).isVisible(), '缺少系统信息');
      await screenshot(page, '14-settings');
      record('Settings 正常', true);
    } catch (e) {
      record('Settings 正常', false, e.message);
    }

    // 15. Dark Mode
    try {
      await page.goto(BASE + '/settings');
      await page.getByRole('button', { name: /深色/ }).click();
      let isDark = false;
      for (let i = 0; i < 10; i += 1) {
        await page.waitForTimeout(300);
        isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        if (isDark) break;
      }
      assert(isDark, '未切换到深色模式');
      await screenshot(page, '15-dark-mode');
      await page.getByRole('button', { name: /浅色/ }).click();
      await page.waitForTimeout(300);
      record('Dark Mode 正常', true);
    } catch (e) {
      record('Dark Mode 正常', false, e.message);
    }

    // 16. 手机端布局
    try {
      const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      });
      const mp = await mobile.newPage();
      await mp.goto(BASE + '/');
      await mp.getByRole('heading', { name: '在线视频下载管理器' }).waitFor();
      // 移动端菜单按钮
      assert(await mp.getByLabel('菜单').isVisible(), '移动端菜单按钮未显示');
      const noHScroll = await mp.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      assert(noHScroll, '移动端存在横向滚动');
      await mp.screenshot({ path: path.join(SHOT_DIR, '16-mobile.png'), fullPage: true });
      await mobile.close();
      record('手机端布局正常', true);
    } catch (e) {
      record('手机端布局正常', false, e.message);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n================ 测试结果 ================`);
  console.log(`通过 ${passed} / ${failed} 失败`);
  for (const r of results) {
    if (!r.ok) console.log(`  ❌ ${r.name}: ${r.detail}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('测试脚本执行失败:', e);
  process.exit(2);
});
