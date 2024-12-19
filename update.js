class ExtensionUpdater {
    constructor() {
        this.githubRepo = 'newave-ws/medico-error-reporting-chrome-extension';
        this.currentVersion = chrome.runtime.getManifest().version;
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`https://api.github.com/repos/newave-ws/medico-error-reporting-chrome-extension`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${data.message}`);
            }

            const latestVersion = data.tag_name.replace('v', '');
            const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;
            
            if (updateAvailable) {
                return {
                    available: true,
                    version: latestVersion,
                    url: data.assets[0]?.browser_download_url,
                    notes: data.body
                };
            }
            
            return { available: false };
        } catch (error) {
            console.error('Update check failed:', error);
            throw error;
        }
    }

    compareVersions(a, b) {
        const verA = a.split('.').map(Number);
        const verB = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(verA.length, verB.length); i++) {
            const numA = verA[i] || 0;
            const numB = verB[i] || 0;
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        return 0;
    }
}

// Add update check to settings page
document.addEventListener('DOMContentLoaded', async () => {
    const updater = new ExtensionUpdater();
    const updateStatus = document.getElementById('updateStatus');
    const checkUpdateBtn = document.getElementById('checkUpdateBtn');

    async function checkForUpdates() {
        try {
            updateStatus.textContent = 'Checking for updates...';
            const update = await updater.checkForUpdates();
            
            if (update.available) {
                updateStatus.innerHTML = `
                    New version ${update.version} available!<br>
                    <a href="${update.url}" target="_blank">Download Update</a><br>
                    <small>${update.notes || ''}</small>
                `;
            } else {
                updateStatus.textContent = 'You have the latest version.';
            }
        } catch (error) {
            updateStatus.textContent = `Update check failed: ${error.message}`;
        }
    }

    if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', checkForUpdates);
    }
}); 