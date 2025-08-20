import { GroupBase } from 'react-select';

export interface BaseCountry {
  label: string;
  value: string;
}

export interface CountryOption extends BaseCountry {
  search: string;
}

export type CountryGroupBase = GroupBase<CountryOption>;

export interface CountrySelectProps {
  value: CountryOption | null;
  onChange: (option: CountryOption | null) => void;
  options: CountryOption[];
  styles: any;
  classNamePrefix: string;
  menuPortalTarget: HTMLElement;
  menuPosition: 'fixed' | 'absolute';
  menuPlacement: 'auto' | 'bottom' | 'top';
  maxMenuHeight: number;
  isOptionDisabled: (option: CountryOption) => boolean;
  'aria-label': string;
  noOptionsMessage: () => string;
  loadingMessage: () => string;
} 