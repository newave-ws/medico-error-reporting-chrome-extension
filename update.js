class ExtensionUpdater {
    constructor() {
        this.githubRepo = 'newave-ws/medico-error-reporting-chrome-extension';
        this.currentVersion = chrome.runtime.getManifest().version;
    }

    async checkForUpdates() {
        try {
            // First check if repository exists
            const repoResponse = await fetch(`https://api.github.com/repos/${this.githubRepo}`);
            const repoData = await repoResponse.json();

            if (!repoResponse.ok) {
                throw new Error(`GitHub API error: ${repoData.message}`);
            }

            // Then fetch the latest release
            const releaseResponse = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases`);
            const releases = await releaseResponse.json();
            
            if (!releaseResponse.ok) {
                throw new Error(`GitHub API error: ${releases.message}`);
            }

            // Check if there are any releases
            if (!releases || releases.length === 0) {
                return {
                    available: false,
                    message: 'No releases found in repository'
                };
            }

            // Get the latest release
            const latestRelease = releases[0];
            const latestVersion = latestRelease.tag_name.replace('v', '');
            const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;
            
            if (updateAvailable) {
                return {
                    available: true,
                    version: latestVersion,
                    url: latestRelease.html_url,
                    notes: latestRelease.body
                };
            }
            
            return { 
                available: false,
                message: 'You have the latest version'
            };
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
                updateStatus.textContent = update.message || 'You have the latest version.';
            }
        } catch (error) {
            updateStatus.textContent = `Update check failed: ${error.message}`;
            console.error('Update check error:', error);
        }
    }

    if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', checkForUpdates);
    }
}); 

document.querySelector('.my-button').addEventListener('click', function() {
    const loader = document.querySelector('.loader');
    loader.style.display = 'block'; // Show loader
    // Simulate an async operation
    setTimeout(() => {
        loader.style.display = 'none'; // Hide loader after operation
    }, 2000); // Adjust time as needed
}); 