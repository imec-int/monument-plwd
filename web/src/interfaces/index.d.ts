import { UserProfile } from '@auth0/nextjs-auth0';
import { UserRole } from '@enum';

export type IButton = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export interface IModalEventDetails {
  caretakers: ICarecircleMember[];
  externalContacts: IExternalContact[];
  fetchCalendarEvents: any;
  plwd: IPlwd;
  selectedEvent: any;
  setSelectedEvent: any;
}

export interface ICalendar {
  initialView?: string;
  height?: string;
  headerToolbarEnabled?: boolean;
  setSelectedEvent?: any;
  selectedEvent?: any;
}

export interface IEvent {
  address: any; // TODO: add correct type
  contactUserId: string;
  endTime: string;
  id: string;
  pickedUp: boolean;
  repeat: string;
  startTime: string;
  title: string;
  carecircleMembers: IUser[];
  externalContacts: IUser[];
}

export type IPlwd = {
  address: any;
  caretakerId: string;
  caretaker: IUser;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  picture: string;
  watchId: string;
};

type CarecircleWithPlwdInfo = {
  affiliation: string;
  id: string;
  permissions: string[];
  plwd: IPlwd;
  userId: string;
};

export interface IUser {
  address: any; // TODO: add correct type
  auth0Id: string;
  carecircles: CarecircleWithPlwdInfo[];
  caretakerId: string;
  email: string;
  firstName: string;
  hasCompletedOnboarding?: boolean;
  id: string;
  lastName: string;
  phone: string;
  picture?: string;
  role: UserRole;
}

export interface ICarecircleMember {
  affiliation: string;
  id: string;
  permissions: string[];
  plwdId: string;
  user: {
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    phone: string;
    picture?: string;
    role: string;
  };
}

export type EmptyIUser = Record<string, unknown>;

export type IExternalContact = {
  affiliation: string;
  email: string;
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  plwdId: string;
  createdAt: string;
};

export type IUserData = {
  currentUser: IUser;
  authenticatedUser: UserProfile;
};

export type ISetupStep = {
  nextStep(): void;
  userData: IUserData;
};

export interface ILocationWithAddress {
  address?: string;
  timestamp: string | Date;
  location: { lat: number; lng: number };
}

export interface Ilocation {
  createdAt: Date;
  id: string;
  location: { lng: number; lat: number };
  timestamp: string | Date;
  watchId: string;
}
