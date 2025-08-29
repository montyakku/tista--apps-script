# Apps Script - イベント参加者向けアンケートリマインダー

## 概要
イベント参加者にアンケートを答えさせており、回答していない人に絞ってリマインドメールを送るためのApps Scriptシステム。

## システム構成

### Google Forms
1. **イベント登録フォーム**
   - 回答データ: イベント日(D列)、アドレス(B列)

2. **アンケート回答フォーム**
   - 回答データ: アドレス(B列)、回答日(C列)

### SendGrid設定
- メール送信サービス: SendGrid
- カスタムフィールド:
  - `last_event_attended_at`: 最後に参加したイベント日
  - `last_survey_event_date`: 最後にアンケートを回答したイベント日

## 機能要件

### 1. イベント登録時の処理
- イベント登録者のメールアドレスに対応するSendGrid Contact
- カスタムフィールド `last_event_attended_at` をイベント日で更新
- 対象メールアドレスがSendGridに存在しない場合、新規Contact登録と同時にカスタムフィールドを更新

### 2. アンケート回答時の処理
- アンケート回答者のカスタムフィールド `last_survey_response_at` をアンケート回答日で更新

### 3. リマインドメール送信
- 送信対象条件:
  - `last_event_attended_at` が対象イベント日と一致
  - `last_survey_event_date` が対象イベント日と一致しない（未回答）
- SendGrid経由でリマインドメールを送信

## 実装予定
- Google Apps Scriptでの自動化処理
- SendGrid APIとの連携
- Google Formsからのトリガー設定