document.addEventListener('DOMContentLoaded', async () => {
  // 加载保存的设置
  const settings = await chrome.storage.sync.get([
    'autoTranslate',
    'targetLang'
  ]);
  
  // 设置界面状态
  document.getElementById('autoTranslate').checked = 
    settings.autoTranslate !== undefined ? settings.autoTranslate : true;
  
  document.getElementById('targetLang').value = 
    settings.targetLang || 'en';
  
  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const newSettings = {
      autoTranslate: document.getElementById('autoTranslate').checked,
      targetLang: document.getElementById('targetLang').value
    };
    
    await chrome.storage.sync.set(newSettings);
    
    // 通知内容脚本设置已更新
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'settingsUpdated',
        settings: newSettings
      });
    }
    
    // 显示保存成功提示
    const saveBtn = document.getElementById('saveSettings');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '已保存 / Saved!';
    setTimeout(() => {
      saveBtn.textContent = originalText;
    }, 2000);
  });
}); 