export interface ExtensionSettings {
  backendUrl: string;
  network: 'testnet' | 'mainnet';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: 'https://api.stellar-greenpay.app',
  network: 'testnet',
};

export function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as ExtensionSettings);
    });
  });
}

export function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// --- Settings page UI ---

document.addEventListener('DOMContentLoaded', async () => {
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
  const form = document.getElementById('settings-form') as HTMLFormElement;
  const urlInput = document.getElementById('backend-url') as HTMLInputElement;
  const urlError = document.getElementById('url-error') as HTMLSpanElement;
  const btnTestnet = document.getElementById('btn-testnet') as HTMLButtonElement;
  const btnMainnet = document.getElementById('btn-mainnet') as HTMLButtonElement;
  const mainnetWarning = document.getElementById('mainnet-warning') as HTMLSpanElement;
  const saveStatus = document.getElementById('save-status') as HTMLDivElement;

  let selectedNetwork: 'testnet' | 'mainnet' = 'testnet';

  function setActiveNetwork(network: 'testnet' | 'mainnet') {
    selectedNetwork = network;
    btnTestnet.classList.toggle('network-btn-active', network === 'testnet');
    btnMainnet.classList.toggle('network-btn-active', network === 'mainnet');
    mainnetWarning.classList.toggle('hidden', network !== 'mainnet');
  }

  const settings = await loadSettings();
  urlInput.value = settings.backendUrl;
  setActiveNetwork(settings.network);

  backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  btnTestnet.addEventListener('click', () => setActiveNetwork('testnet'));
  btnMainnet.addEventListener('click', () => setActiveNetwork('mainnet'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    urlError.classList.add('hidden');
    saveStatus.textContent = '';
    saveStatus.className = 'status-message';

    const rawUrl = urlInput.value.trim();
    try {
      new URL(rawUrl);
    } catch {
      urlError.classList.remove('hidden');
      return;
    }

    try {
      await saveSettings({ backendUrl: rawUrl, network: selectedNetwork });
      saveStatus.textContent = 'Settings saved.';
      saveStatus.classList.add('success');
    } catch (err: any) {
      saveStatus.textContent = `Failed to save: ${err.message}`;
      saveStatus.classList.add('error');
    }
  });
});
