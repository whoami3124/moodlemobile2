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
import { AddonNotesProvider } from './notes';
import { CoreCoursesProvider } from '../../../core/courses/providers/courses';
import { CoreCoursesHandler, CoreCoursesHandlerData } from '../../../core/courses/providers/delegate';

/**
 * Handler to inject an option into the course main menu.
 */
@Injectable()
export class AddonNotesCoursesHandler implements CoreCoursesHandler {
    name = 'AddonNotes';
    priority = 200;
    protected coursesNavEnabledCache = {};

    constructor(private notesProvider: AddonNotesProvider) {
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean|Promise<boolean> {
        let isDisabled = this.notesProvider.isNotesDisabledInSite();
        return !isDisabled;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreCoursesHandlerData {
        return {
            title: 'addon.calendar.calendar',
            action: (courseId: number) => {},
        };
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     * For perfomance reasons, do NOT call WebServices in here, call them in shouldDisplayForCourse.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any) : boolean {
        if (accessData && accessData.type == CoreCoursesProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions && typeof navOptions.notes != 'undefined') {
            return navOptions.notes;
        }

        // Assume it's enabled for now, further checks will be done in shouldDisplayForCourse.
        return true;
    }

    /**
     * Whether or not the handler should be displayed for a course. If not implemented, assume it's true.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    shouldDisplayForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any) : boolean|Promise<boolean> {
        if (navOptions && typeof navOptions.notes != 'undefined') {
            return navOptions.notes;
        }

        if (typeof this.coursesNavEnabledCache[courseId] != 'undefined') {
            return this.coursesNavEnabledCache[courseId];
        }
        return this.notesProvider.isPluginViewNotesEnabledForCourse(courseId).then(function(enabled) {
            this.coursesNavEnabledCache[courseId] = enabled;
            return enabled;
        });
    }
}
