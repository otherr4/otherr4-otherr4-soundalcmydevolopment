declare module 'react-select-country-list' {
  interface Country {
    label: string;
    value: string;
  }
  
  interface CountryList {
    getData: () => Country[];
    getLabel: (value: string) => string;
    getValue: (label: string) => string;
    getValues: () => string[];
    getLabels: () => string[];
  }
  
  function countryList(): CountryList;
  export = countryList;
} 