import { showGitHubModal, quickSync, getCurrentGitHubConfig } from './github';
import { updateGitHubStatus } from './projects';
import { getProject, saveProject } from './db';
import { state } from './state';
import { t } from './i18n';
import { toast } from './toast';
import { showModal } from './modal';
import {
    githubBtn, ghSyncBtn, ghSettingsBtn, ghDisconnectBtn,
} from './dom';

export function initGitHub(): void {
    // GitHub button in toolbar — opens setup or settings
    githubBtn.addEventListener('click', async () => {
        const config = await getCurrentGitHubConfig();
        await showGitHubModal(config || undefined);
    });

    // Sync button
    ghSyncBtn.addEventListener('click', () => quickSync());

    // Settings button
    ghSettingsBtn.addEventListener('click', async () => {
        const config = await getCurrentGitHubConfig();
        if (config) {
            await showGitHubModal(config);
        }
    });

    // Disconnect button
    ghDisconnectBtn.addEventListener('click', async () => {
        const confirmed = await showModal({
            title: t('ghDisconnect'),
            body: t('ghDisconnectConfirm'),
            confirmText: t('ghDisconnect'),
            confirmClass: 'btn-danger',
        });
        if (!confirmed) return;

        if (state.currentProjectId) {
            const project = await getProject(state.currentProjectId);
            if (project) {
                delete project.github;
                await saveProject(project);
            }
        }
        updateGitHubStatus(undefined);
        toast(t('ghDisconnected'), 'success');
    });
}