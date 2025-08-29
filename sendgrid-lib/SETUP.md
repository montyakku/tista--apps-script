# SendGrid Library セットアップ手順

## 1. Apps Scriptライブラリプロジェクト作成
1. [Google Apps Script](https://script.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「SendGrid Library」に変更

## 2. スクリプトファイルの追加
1. `SendGridLib.gs`（メイン）と`SendGridLibTest.gs`（テスト用）をApps Scriptプロジェクトに追加
2. ファイルを保存

## 2-B. 本番デプロイ時の難読化（オプション）
### Step 1: コードの難読化
1. [JavaScript Obfuscator](https://obfuscator.io/)にアクセス
2. 以下の設定を推奨します：
   - Control Flow Flattening: ON
   - Dead Code Injection: ON
   - String Array: ON
   - String Array Threshold: 0.8
   - Transform Object Keys: ON
   - Unicode Escape Sequence: ON
3. `SendGridLib.gs`の内容をコピーして「JavaScript Code」欄に貼り付け
4. 「Obfuscate」ボタンをクリック
5. 難読化されたコードをコピー

### Step 2: 本番環境への適用
1. 本番用の新しいApps Scriptプロジェクトを作成
2. 難読化されたコードを`Code.gs`に貼り付け
3. **テストファイルは含めない**（本番環境のため）
4. ライブラリとしてデプロイ

**重要:** 
- 開発時はテストファイル付きの非難読化版を使用
- 本番デプロイ時のみ難読化版を使用
- 元のコードは必ずバックアップしておく

## 3. API Key設定
1. 左サイドバーの「プロジェクトの設定」（歯車アイコン）をクリック
2. 「スクリプト プロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名: `SENDGRID_API_KEY`
4. 値: 実際のSendGrid APIキーを入力
5. 「プロパティを保存」をクリック

## 4. 設定テスト
### 基本設定確認
1. `testLibraryConfiguration`関数を実行
2. ログで設定が正しいことを確認

### 個別機能テスト
- `testFindContactByEmail()` - Contact検索テスト
- `testCreateContact()` - Contact作成テスト
- `testUpdateContact()` - Contact更新テスト
- `testSearchContacts()` - Contact複数検索テスト
- `runAllTests()` - 設定確認テストのみ実行

**注意**: テスト関数は`SendGridLibTest.gs`ファイル内にあります。

## 5. ライブラリとして公開
1. 「デプロイ」→「新しいデプロイ」をクリック
2. 種類で「ライブラリ」を選択
3. 「デプロイ」をクリック
4. **スクリプトID**をコピー（重要！）

## 使用方法（他のプロジェクトから）

### ライブラリの追加
1. 使用したいApps Scriptプロジェクトを開く
2. 左サイドバーの「ライブラリ」をクリック
3. 「ライブラリを追加」でスクリプトIDを入力
4. 「検索」→ 最新バージョンを選択 → 「保存」
5. 識別子を「SendGridLib」に設定

### コードでの使用例
```javascript
// Contact更新
SendGridLib.updateContact('test@example.com', 'last_event_attended_at', '2024-01-01');

// Contact検索
const contacts = SendGridLib.searchContacts("email LIKE 'test@example.com'");

// メール送信
const recipients = [
  { email: 'user@example.com', data: { name: 'User' } }
];
SendGridLib.sendEmail('template-id', recipients, { event_date: '2024-01-01' });
```

## 利用可能な関数

| 関数名 | 説明 | 使用例 |
|--------|------|--------|
| `updateContact(email, customField, value)` | Contact情報を更新 | Contact作成/更新 |
| `findContactByEmail(email)` | Contactを検索 | ContactID取得 |
| `searchContacts(query)` | 複数Contact検索 | 条件検索 |
| `sendEmail(templateId, recipients, data, from, fromName)` | メール送信 | キャンペーン送信 |

## セキュリティ
- API Keyはライブラリ内で一元管理
- 各プロジェクトでAPI Key設定不要
- 組織内限定公開でセキュア
- **コード難読化により実装詳細を保護**

## 注意事項
- 難読化されたコードはデバッグが困難になります
- ライブラリ更新時は、元のコードを修正してから再度難読化してください
- 難読化前の元コードは安全な場所にバックアップしてください