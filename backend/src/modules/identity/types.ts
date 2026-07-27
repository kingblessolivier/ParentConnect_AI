/**
 * Identity domain types. Mirrors data-model.md (PARENT, CONSENT).
 *
 * Data minimisation (NFR-15, FR-24): a child is represented ONLY by an age band.
 * There is no field anywhere here for a child's name, date of birth, or ID.
 */

export type Language = 'rw' | 'en' | 'fr';
export type Channel = 'app' | 'sms' | 'ussd' | 'ivr';
export type AgeBand = '10_12' | '13_15' | '16_19';
export type UrbanRural = 'urban' | 'rural';
export type CaregiverGender = 'female' | 'male' | 'other';
export type Role = 'parent' | 'chw' | 'champion' | 'school' | 'cpo' | 'admin' | 'reviewer';
export type ConsentMethod = 'app' | 'sms' | 'ivr' | 'assisted';

export const LANGUAGES: readonly Language[] = ['rw', 'en', 'fr'];
export const CHANNELS: readonly Channel[] = ['app', 'sms', 'ussd', 'ivr'];
export const AGE_BANDS: readonly AgeBand[] = ['10_12', '13_15', '16_19'];

export interface ParentProfile {
  id: string;
  /** Hashed phone number (P2) for lookup — never the raw number. */
  phoneHash: string;
  /** Encrypted phone number (P2) for outbound delivery (SMS/IVR). Never exposed. */
  phoneEnc?: string;
  /** Optional friendly alias; a real name is never required (FR-04). */
  displayAlias?: string;
  district?: string;
  sector?: string;
  urbanRural?: UrbanRural;
  caregiverGender?: CaregiverGender;
  preferredLanguage: Language;
  preferredChannel: Channel;
  /** Ages of children as bands ONLY (FR-06/24). */
  childBands: AgeBand[];
  role: Role;
  createdAt: string;
}

/** Client-facing profile fields (no phoneHash / internal ids leaked needlessly). */
export interface ProfileInput {
  displayAlias?: string;
  district?: string;
  sector?: string;
  urbanRural?: UrbanRural;
  caregiverGender?: CaregiverGender;
  preferredLanguage?: Language;
  preferredChannel?: Channel;
  childBands?: AgeBand[];
}

export interface Consent {
  id: string;
  parentId: string;
  purpose: string;
  /** Language the consent was given in (NFR-16). */
  language: Language;
  method: ConsentMethod;
  givenAt: string;
  withdrawnAt?: string;
}

export interface ConsentInput {
  purpose: string;
  language: Language;
  method: ConsentMethod;
}
