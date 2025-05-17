import dotenv from 'dotenv';
import { App } from '@slack/bolt';
import { getProjectManager } from './project.js';
dotenv.config();

// Boltアプリの初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ポート番号の設定（デフォルト: 3000）
const port = process.env.PORT || 3000;

// スラッシュコマンドのリスナーの設定
app.command('/ito_project', async ({ command, ack, say }) => {
  // コマンドを受け取ったことを確認
  await ack();

  try {
    // コマンドの引数を取得
    const args = command.text.split(' ');
    const projectName = args[0].toLowerCase();

    if (!projectName) {
      await say('プロジェクト名を指定してください。例: `/ito_project bk`');
      return;
    }

    // プロジェクト名に対応する担当者情報を取得
    const response = getProjectManager(projectName);

    if (response) {
      await say(response);
    } else {
      await say(`プロジェクト "${projectName}" の情報が見つかりません。`);
    }
  } catch (error) {
    console.error(error);
    await say('エラーが発生しました。もう一度お試しください。');
  }
});

// アプリの起動
(async () => {
  await app.start(port);
  console.log(`⚡️ Slackアプリが http://localhost:${port} で起動しました`);
})();
