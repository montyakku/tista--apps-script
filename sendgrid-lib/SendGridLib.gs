const SENDGRID_API_KEY = PropertiesService.getScriptProperties().getProperty('SENDGRID_API_KEY');
const SENDGRID_BASE_URL = 'https://api.sendgrid.com/v3';

function findContactByEmail(email) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/contactdb/recipients/search`;
  const payload = {
    conditions: [
      {
        field: "email",
        value: email,
        operator: "eq",
        and_or: ""
      }
    ]
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (data.recipients && data.recipients.length > 0) {
    return data.recipients[0].id;
  }
  
  return null;
}

function createContact(email, fields = {}) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/contactdb/recipients`;
  const contactData = {
    email: email,
    ...fields
  };
  
  const payload = [contactData];
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (data.persisted_recipients && data.persisted_recipients.length > 0) {
    return data.persisted_recipients[0];
  }
  
  throw new Error('Failed to create contact');
}

function updateContactFields(email, fields) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  // Legacy APIでは、fieldをrecipient更新時に直接指定
  const url = `${SENDGRID_BASE_URL}/contactdb/recipients`;
  
  const payload = [
    {
      email: email,
      ...fields
    }
  ];
  
  const options = {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const fieldNames = Object.keys(fields).join(', ');
  Logger.log(`Updated ${fieldNames} for contact ${email}`);
  
  return response.getResponseCode() === 200 || response.getResponseCode() === 201;
}

function findContactById(contactId) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/contactdb/recipients/${contactId}`;
  
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  return data;
}

function updateContact(email, fields, createOnlyFields = {}) {
  try {
    let contactId = findContactByEmail(email);
    
    if (!contactId) {
      // 新規作成時は両方のfieldsを使用
      const allFields = { ...fields, ...createOnlyFields };
      contactId = createContact(email, allFields);
      return contactId ? true : false;
    } else {
      // 既存の場合は通常のfieldsのみ更新
      return updateContactFields(email, fields);
    }
    
  } catch (error) {
    Logger.log(`Error updating contact ${email}: ${error.message}`);
    throw error;
  }
}

function searchContacts(email) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/contactdb/recipients/search`;
  const payload = {
    conditions: [
      {
        field: "email",
        value: email,
        operator: "contains",
        and_or: ""
      }
    ]
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  return data.recipients || [];
}

function sendEmail(templateId, recipients, templateData = {}, fromEmail = null, fromName = null) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/mail/send`;
  
  const personalizations = recipients.map(recipient => ({
    to: [{ email: recipient.email }],
    dynamic_template_data: { ...templateData, ...recipient.data }
  }));
  
  const payload = {
    template_id: templateId,
    personalizations: personalizations
  };
  
  if (fromEmail) {
    payload.from = {
      email: fromEmail,
      name: fromName || fromEmail
    };
  }
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  return response.getResponseCode() === 202;
}

function findSegmentByName(segmentName) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/contactdb/segments`;
  
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (data.segments) {
    const existingSegment = data.segments.find(segment => segment.name === segmentName);
    if (existingSegment) {
      Logger.log(`Found existing segment: ${existingSegment.id}`);
      return existingSegment.id;
    }
  }
  
  return null;
}

function createSegment(segmentName, conditions) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  // 既存のSegmentを確認
  const existingSegmentId = findSegmentByName(segmentName);
  if (existingSegmentId) {
    return existingSegmentId;
  }
  
  // 新規作成
  const url = `${SENDGRID_BASE_URL}/contactdb/segments`;
  const payload = {
    name: segmentName,
    conditions: conditions
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (data.id) {
    Logger.log(`Segment created: ${data.id}`);
    return data.id;
  }
  
  throw new Error('Failed to create segment');
}

function createCampaignWithContent(campaignName, subject, textContent, segmentId, senderId = null, unsubscribeGroupId = null, testListId = null, scheduledTime = null) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  Logger.log(`Creating campaign with text content length: ${textContent ? textContent.length : 0}`);
  Logger.log(`Text content preview: ${textContent ? textContent.substring(0, 100) + '...' : 'null'}`);
  
  const url = `${SENDGRID_BASE_URL}/campaigns`;
  const payload = {
    title: campaignName,
    subject: subject,
    segment_ids: [segmentId],
    html_content: (textContent || '').replace(/\n/g, '<br>')
  };
  
  // Send to の設定（テスト用リストがある場合）
  if (testListId) {
    payload.list_ids = [testListId];
  }
  
  // Sender ID の設定
  if (senderId) {
    payload.sender_id = senderId;
  }
  
  // Unsubscribe Group の設定
  if (unsubscribeGroupId) {
    payload.suppression_group_id = unsubscribeGroupId;
  }
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  Logger.log(`Campaign payload: ${JSON.stringify(payload, null, 2)}`);
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (data.id) {
    Logger.log(`Campaign draft created: ${data.id}`);
    
    // 送信スケジュールを設定
    if (scheduledTime) {
      const scheduleSuccess = scheduleCampaign(data.id, scheduledTime);
      if (scheduleSuccess) {
        Logger.log(`Campaign ${data.id} scheduled for: ${scheduledTime}`);
      } else {
        Logger.log(`Failed to schedule campaign ${data.id}`);
      }
    }
    
    return data.id;
  }
  
  Logger.log(`Campaign creation failed: ${JSON.stringify(data)}`);
  throw new Error('Failed to create campaign');
}

function scheduleCampaign(campaignId, scheduledTime) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in library properties');
  }
  
  const url = `${SENDGRID_BASE_URL}/campaigns/${campaignId}/schedules`;
  const payload = {
    send_at: Math.floor(scheduledTime.getTime() / 1000) // Unix timestamp (秒)
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  Logger.log(`Scheduling campaign ${campaignId} at: ${scheduledTime} (Unix timestamp: ${payload.send_at})`);
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    return response.getResponseCode() === 201 || response.getResponseCode() === 200;
  } catch (error) {
    Logger.log(`Error scheduling campaign: ${error.message}`);
    return false;
  }
}

