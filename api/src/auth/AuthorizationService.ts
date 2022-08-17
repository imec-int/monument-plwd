import { IPlwd } from '../models/Plwd';
import { IUser, User } from '../models/User';
import { UserRole } from '../models/UserRole';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import { CalendarPermissions, CarecirclePermissions, LocationPermissions } from './Permissions';

enum HttpStatusCodes {
    OK = 200,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
}

export interface ValidationStatus {
    status: number;
    message?: string;

    isAuthorized(): boolean;
    isUnauthorized(): boolean;
}

export class SimpleValidationStatus implements ValidationStatus {
    readonly message: string;
    readonly status: number;

    constructor(status: number, message = '') {
        this.message = message;
        this.status = status;
    }

    isUnauthorized(): boolean {
        return this.status !== HttpStatusCodes.OK;
    }

    isAuthorized(): boolean {
        return this.status == HttpStatusCodes.OK;
    }

    static unauthorized() {
        return new SimpleValidationStatus(HttpStatusCodes.UNAUTHORIZED);
    }

    static forbidden(message = 'Forbidden') {
        return new SimpleValidationStatus(HttpStatusCodes.FORBIDDEN, message);
    }

    static ok() {
        return new SimpleValidationStatus(HttpStatusCodes.OK);
    }

    static notFound() {
        return new SimpleValidationStatus(HttpStatusCodes.NOT_FOUND);
    }
}

export class DefaultAuthorizationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly plwdRepository: PlwdRepository,
        private readonly carecircleMemberRepository: CarecircleMemberRepository,
        private readonly calendarEventRepository: CalendarEventRepository
    ) {}

    /**
     * Check different roles or types
     **/
    hasAdminRole(user: IUser) {
        return user.role === UserRole.ADMIN;
    }

    hasPrimaryCaretakerRole(user: IUser) {
        return user.role === UserRole.PRIMARY_CARETAKER;
    }

    isPrimaryCaretakerOfPlwd(user: IUser, plwd: IPlwd) {
        return user.id === plwd.caretakerId;
    }

    /**
     * Check if user is authorized for action
     */
    canAccessLocation(permissions: string[]) {
        return (
            permissions.includes(LocationPermissions['when-assigned:locations']) ||
            permissions.includes(LocationPermissions['always:locations'])
        );
    }

    canAccessLocationWhenAssigned(permissions: string[]) {
        return permissions.includes(LocationPermissions['when-assigned:locations']);
    }

    canManageLocation(permissions: string[]) {
        return permissions.includes(LocationPermissions['always:locations']);
    }

    canAccessCalendar(permissions: string[]) {
        return (
            permissions.includes(CalendarPermissions['read:calendar']) ||
            permissions.includes(CalendarPermissions['manage:calendar'])
        );
    }

    canManageCalendar(permissions: string[]) {
        return permissions.includes(CalendarPermissions['manage:calendar']);
    }

    canAccessCarecircle(permissions: string[]) {
        return (
            permissions.includes(CarecirclePermissions['read:carecircle']) ||
            permissions.includes(CarecirclePermissions['manage:carecircle'])
        );
    }

    canManageCarecircle(permissions: string[]) {
        return permissions.includes(CarecirclePermissions['manage:carecircle']);
    }

    // Check if user is authorized to fetch locations when assigned to an event by checking if there is an ongoing event for the plwd
    async isAuthorizedForActionOnPlwdWithOngoingEvent(requestingUser: User, plwdId: string): Promise<ValidationStatus> {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);
        const plwd = await this.plwdRepository.get(plwdId);

        if (!user) return SimpleValidationStatus.notFound();
        if (!plwd) return SimpleValidationStatus.notFound();

        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();
        if (this.isPrimaryCaretakerOfPlwd(user, plwd)) return SimpleValidationStatus.ok();

        const carecircleMembership = await this.carecircleMemberRepository.getByUserId(user.id);
        const carecircleForCurrentPlwd = carecircleMembership.find((c) => c.plwdId === plwd.id);

        if (!carecircleForCurrentPlwd) return SimpleValidationStatus.forbidden();

        // Check if there is an ongoing event for the plwd
        const permissions = carecircleForCurrentPlwd.permissions;
        // If the permission of the user is "when-assigned" we need to check if there is an ongoing event from the calendar for the plwd
        if (this.canManageLocation(permissions)) {
            return SimpleValidationStatus.ok();
        }
        if (this.canAccessLocationWhenAssigned(permissions)) {
            const ongoingEvent = await this.calendarEventRepository.getOngoingEventsByPlwdId(plwdId);
            if (ongoingEvent.length) return SimpleValidationStatus.ok();
        }
        return SimpleValidationStatus.forbidden();
    }

    async isAuthorizedForActionOnPlwd(
        requestingUser: User,
        plwdId: string,
        isAuthorizedForAction: (permissions: string[]) => boolean
    ) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);
        const plwd = await this.plwdRepository.get(plwdId);

        if (!user) return SimpleValidationStatus.notFound();
        if (!plwd) return SimpleValidationStatus.notFound();

        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();
        if (this.isPrimaryCaretakerOfPlwd(user, plwd)) return SimpleValidationStatus.ok();

        const carecircleMembership = await this.carecircleMemberRepository.getByUserId(user.id);
        const carecircleForCurrentPlwd = carecircleMembership.find((c) => c.plwdId === plwd.id);
        const permissions = carecircleForCurrentPlwd?.permissions;

        if (!permissions) return SimpleValidationStatus.forbidden();

        return isAuthorizedForAction(permissions) ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }

    async hasAccessToPlwd({ requestingUser, plwdId }: { requestingUser: User; plwdId: string }) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);
        const plwd = await this.plwdRepository.get(plwdId);

        if (!user) return SimpleValidationStatus.notFound();
        if (!plwd) return SimpleValidationStatus.notFound();

        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();
        if (this.isPrimaryCaretakerOfPlwd(user, plwd)) return SimpleValidationStatus.ok();

        const carecircleMembership = await this.carecircleMemberRepository.getByUserId(user.id);
        const carecircleForCurrentPlwd = carecircleMembership.find((c) => c.plwdId === plwd.id);

        return carecircleForCurrentPlwd ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }

    async isAuthorizedAsAdmin(requestingUser: User) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);

        if (!user) return SimpleValidationStatus.notFound();

        return this.hasAdminRole(user) ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }

    async isAuthorizedAsCaretaker(requestingUser: User, plwdId: string) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);
        const plwd = await this.plwdRepository.get(plwdId);

        if (!user) return SimpleValidationStatus.notFound();
        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();

        return user.id === plwd?.caretakerId ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }

    async hasAdminOrPrimaryCaretakerRole(requestingUser: User) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);

        if (!user) return SimpleValidationStatus.notFound();
        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();
        if (this.hasPrimaryCaretakerRole(user)) return SimpleValidationStatus.ok();

        return SimpleValidationStatus.forbidden();
    }

    async hasAccessToUserByAuth0Id(requestingUser: User, auth0Id: string) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);

        if (!user) return SimpleValidationStatus.notFound();
        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();

        return user.auth0Id === auth0Id ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }

    async hasAccessToUserById(requestingUser: User, id: string) {
        const user = await this.userRepository.getUserByAuth0Id(requestingUser.id);

        if (!user) return SimpleValidationStatus.notFound();
        if (this.hasAdminRole(user)) return SimpleValidationStatus.ok();

        return user.id === id ? SimpleValidationStatus.ok() : SimpleValidationStatus.forbidden();
    }
}
