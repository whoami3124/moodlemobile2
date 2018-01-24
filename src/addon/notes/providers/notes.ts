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

import { Injectable } from '@angular/core';
import { CoreAppProvider } from '../../../providers/app';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreSiteWSPreSets } from '../../../classes/site';
import { CoreConfigProvider } from '../../../providers/config';
import { TranslateService } from '@ngx-translate/core';

/**
 * Service to handle notes.
 */
@Injectable()
export class AddonNotesProvider {

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private utilsProvider: CoreUtilsProvider, private configProvider: CoreConfigProvider,
            private translate: TranslateService) {
        this.logger = logger.getInstance('AddonNotesProvider');
    }

     /**
     * Add a note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNote
     * @param {Number} userId       User ID of the person to add the note.
     * @param {Number} courseId     Course ID where the note belongs.
     * @param {String} publishState Personal, Site or Course.
     * @param {String} noteText     The note text.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with boolean: true if note was sent to server, false if stored in device.
     */
    addNote(userId: number, courseId: number, publishState: string, noteText: string, siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!this.appProvider.isOnline()) {
            // App is offline, store the note.
            /* return storeOffline(); */
        }

        // Send note to server.
        return this.addNoteOnline(userId, courseId, publishState, noteText, siteId).then(() => {
            return true;
        }).catch((data) => {
            if (data.wserror) {
                // It's a WebService error, the user cannot add the note so don't store it.
                return Promise.reject(data.error);
            } else {
                // Error sending note, store it to retry later.
                /* return storeOffline(); */
            }
        });

        // Convenience function to store a note to be synchronized later.
        /**function storeOffline() {
            return $mmaNotesOffline.saveNote(userId, courseId, publishState, noteText, siteId).then(() => {
                return false;
            });
        }**/
    };

    /**
     * Add a note. It will fail if offline or cannot connect.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNoteOnline
     * @param {Number} userId       User ID of the person to add the note.
     * @param {Number} courseId     Course ID where the note belongs.
     * @param {String} publishState Personal, Site or Course.
     * @param {String} noteText     The note text.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when added, rejected otherwise. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    addNoteOnline(userId: number, courseId: number, publishState: string, noteText: string, siteId?: string): Promise<any> {
        var notes = [
                {
                    userid: userId,
                    publishstate: publishState,
                    courseid: courseId,
                    text: noteText,
                    format: 1
                }
            ];

        return this.addNotesOnline(notes, siteId).catch((error) => {
            return Promise.reject({
                error: error,
                wserror: this.utilsProvider.isWebServiceError(error)
            });
        }).then((response) => {
            if (response && response[0] && response[0].noteid === -1) {
                // There was an error, and it should be translated already.
                return Promise.reject({
                    error: response[0].errormessage,
                    wserror: true
                });
            }

            // A note was added, invalidate the course notes.
            return this.invalidateNotes(courseId, siteId).catch(() => {
                // Ignore errors.
            });
        });
    };

    /**
     * Add several notes. It will fail if offline or cannot connect.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNotesOnline
     * @param  {any[]} notes  Notes to save.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that notes
     *                           have been added, the resolve param can contain errors for notes not sent.
     */
    addNotesOnline(notes: any[], siteId?: string): Promise<any> {
        if (!notes || !notes.length) {
            return Promise.resolve()
        }

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            var data = {
                    notes: notes
                };

            return site.write('core_notes_create_notes', data);
        });
    };

    /**
     * Returns whether or not the add note plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginAddNoteEnabled(siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.canUseAdvancedFeature('enablenotes')) {
                return false;
            } else if (!site.wsAvailable('core_notes_create_notes')) {
                return false;
            }

            return true;
        });
    };

    /**
     * Returns whether or not the add note plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabledForCourse
     * @param  {Number} courseId ID of the course.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginAddNoteEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            // The only way to detect if it's enabled is to perform a WS call.
            // We use an invalid user ID (-1) to avoid saving the note if the user has permissions.
            var data = {
                    notes: [
                        {
                            userid: -1,
                            publishstate: 'personal',
                            courseid: courseId,
                            text: '',
                            format: 1
                        }
                    ]
                };

            // Use .read to cache data and be able to check it in offline. This means that, if a user loses the capabilities
            // to add notes, he'll still see the option in the app.
            return site.read('core_notes_create_notes', data).then(() => {
                // User can add notes.
                return true;
            }).catch(() => {
                return false;
            });
        });
    };

    /**
     * Returns whether or not the read notes plugin is enabled for the current site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginViewNotesEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginViewNotesEnabled(siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.canUseAdvancedFeature('enablenotes')) {
                return false;
            } else if (!site.wsAvailable('core_notes_get_course_notes')) {
                return false;
            }

            return true;
        });
    };

    /**
     * Returns whether or not the read notes plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginViewNotesEnabledForCourse
     * @param  {Number} courseId ID of the course.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginViewNotesEnabledForCourse(courseId, siteId?: string): Promise<boolean> {
        return this.getNotes(courseId, false, true, siteId).then(() => {
            return true;
        }).catch(() => {
            return false;
        });
    };

    /**
     * Get the cache key for the get notes call.
     *
     * @param  {Number} courseId ID of the course to get the notes from.
     * @return {String}          Cache key.
     */
    getNotesCacheKey(courseId: number): string {
        return 'mmaNotes:notes:' + courseId;
    }

    /**
     * Get users notes for a certain site, course and personal notes.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotes
     * @param  {Number} courseId     ID of the course to get the notes from.
     * @param  {Boolean} [ignoreCache] True when we should not get the value from the cache.
     * @param  {Boolean} [onlyOnline]  True to return only online notes, false to return both online and offline.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise to be resolved when the notes are retrieved.
     */
    getNotes(courseId: number, ignoreCache?: boolean, onlyOnline?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.logger.debug('Get notes for course ' + courseId);

        return this.sitesProvider.getSite(siteId).then((site) => {

            let data = {
                    courseid : courseId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getNotesCacheKey(courseId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_notes_get_course_notes', data, preSets).then((notes) => {
                if (onlyOnline) {
                    return notes;
                }
                /*
                // Get offline notes and add them to the list.
                return $mmaNotesOffline.getNotesForCourse(courseId, siteId).then((offlineNotes) => {
                    angular.forEach(offlineNotes, (note) => {
                        var fieldName = note.publishstate + 'notes';
                        if (!notes[fieldName]) {
                            notes[fieldName] = [];
                        }
                        note.offline = true;
                        // Add note to the start of array since last notes are shown first.
                        notes[fieldName].unshift(note);
                    });

                    return notes;
                });*/
            });
        });
    };

    /**
     * Get user data for notes since they only have userid.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotesUserData
     * @param  {any[]} notes  Notes to get the data for.
     * @param  {Number} courseId ID of the course the notes belong to.
     * @return {Promise}         Promise always resolved. Resolve param is the formatted notes.
     */
    getNotesUserData(notes: any[], courseId: number): Promise<any> {
        var promises = [];

        /*notes.forEach((note) => {
            var promise = $mmUser.getProfile(note.userid, courseId, true).then((user) => {
                note.userfullname = user.fullname;
                note.userprofileimageurl = user.profileimageurl;
            }, () => {
                // Error getting profile. Set default data.
                return this.translate.('mma.notes.userwithid', {id: note.userid}).then((str) => {
                    note.userfullname = str;
                });
            });
            promises.push(promise);
        });*/
        return Promise.all(promises).then(() => {
            return notes;
        });
    };

    /**
     * Given a list of notes, check if any of them is an offline note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#hasOfflineNote
     * @param  {any[]}  notes List of notes.
     * @return {Boolean}         True if at least 1 note is offline, false otherwise.
     */
    hasOfflineNote(notes: any[]): boolean {
        if (!notes || !notes.length) {
            return false;
        }

        for (var i = 0, len = notes.length; i < len; i++) {
            if (notes[i].offline) {
                return true;
            }
        }

        return false;
    };

    /**
     * Invalidate get notes WS call.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#invalidateNotes
     * @param {Number} courseId  Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    invalidateNotes(courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getNotesCacheKey(courseId));
        });
    };
}
