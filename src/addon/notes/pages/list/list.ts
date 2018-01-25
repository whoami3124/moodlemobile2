// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, ViewChild, OnDestroy } from '@angular/core';
import { IonicPage, Content, PopoverController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonNotesProvider } from '../../providers/notes';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../../providers/utils/text';
import { CoreUtilsProvider } from '../../../../providers/utils/utils';
import { CoreSite } from '../../../../classes/site';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreAppProvider } from '../../../../providers/app';
import { CoreSplitViewComponent } from '../../../../components/split-view/split-view';

/**
 * Page that displays the list of notes.
 */
@IonicPage({ segment: 'addon-notes-list' })
@Component({
    selector: 'page-addon-notes-list',
    templateUrl: 'list.html',
})
export class AddonNotesListPage implements OnDestroy {

    courseId = 0;
    currentSite: CoreSite;
    type = '';
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    notes: any[];
    hasOffline = false;
    notesLoaded = false;

    constructor(private translate: TranslateService, private notesProvider: AddonNotesProvider, private navParams: NavParams,
        private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider,
        private textUtils: CoreTextUtilsProvider, private sitesProvider: CoreSitesProvider) {

        this.courseId = navParams.get('courseId') || sitesProvider.getCurrentSite().getSiteHomeId();
        this.currentSite = sitesProvider.getCurrentSite();
    }

    /**
     * Fetch notes
     * @param {boolean} sync       when to resync notes
     * @param {boolean} showErrors when to display errors or not
     * @return {Promise<any>}      promise with the notes
     */
    fetchNotes(sync: boolean, showErrors: boolean): Promise<any> {
        const promise = sync ? this.syncNotes(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.notesProvider.getNotes(this.courseId).then((notes) => {
                notes = notes[this.type + 'notes'];

                this.hasOffline = this.notesProvider.hasOfflineNote(notes);

                return this.notesProvider.getNotesUserData(notes, this.courseId).then((notes) => {
                    this.notes = notes;
                });

            }, (message) => {
                this.domUtils.showErrorModal(message);
            });
        }).finally(() => {
            this.notesLoaded = true;
            this.refreshIcon = 'ion-refresh';
            this.syncIcon = 'ion-loop';
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchNotes(true, false).then(() => {
            // Add log in Moodle.
            this.currentSite.write('core_notes_view_notes', {
                courseid: this.courseId,
                userid: 0
            });
        });
    }

    /**
     * Refresh notes on PTR.
     *
     * @param {boolean} showErrors whether to display errors or not
     * @param {any}     refresher  refresher instance
     */
    refreshNotes(showErrors: boolean, refresher?: any): void {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.notesProvider.invalidateNotes(this.courseId).finally(() => {
            this.fetchNotes(true, showErrors).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

    // Tries to synchronize the course notes.

    /**
     * To syncrhonize course notes.
     * @param  {boolean}      showErrors whether to display errors or not
     * @return {Promise<any>}            promise with result
     */
    syncNotes(showErrors: boolean): Promise<any> {
        /*return this.notesProviderSync.syncNotes(this.courseId).then((warnings) => {
            this.showSyncWarnings(warnings);
        }).catch((error) => {
            if (showErrors) {
                if (error) {
                    this.domUtils.showErrorModal(error);
                } else {
                    this.domUtils.showErrorModal('mm.core.errorsync', true);
                }
            }
            return Promise.reject();
        });*/
        return Promise.resolve();
    }

    /**
     * Show sync warnings if any.
     *
     * @param {string[]} warnings the warnings
     */
    showSyncWarnings(warnings: string[]): void {
        const message = this.textUtils.buildMessage(warnings);
        if (message) {
            this.domUtils.showErrorModal(message);
        }
    }

    /**
    scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaNotesListScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Refresh data if this course notes are synchronized automatically.
    syncObserver = $mmEvents.on(mmaNotesAutomSyncedEvent, (data) => {
        if (data && data.siteid == this.currentSite.getId() && data.courseid == this.courseId) {
            // Show the sync warnings.
            showSyncWarnings(data.warnings);

            // Refresh the data.
            this.notesLoaded = false;
            this.refreshIcon = 'spinner';
            this.syncIcon = 'spinner';
            scrollTop();

            fetchNotes(false);
        }
    });
        **/

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        /*syncObserver && syncObserver.off && syncObserver.off();*/
    }
}
