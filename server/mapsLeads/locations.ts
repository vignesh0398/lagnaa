export interface LocationState {
  code: string;
  label: string;
  cities: string[];
}

export const MAP_LOCATIONS: Record<string, LocationState[]> = {
  IN: [
    { code: 'AN', label: 'Andaman and Nicobar Islands', cities: ['Port Blair'] },
    { code: 'AP', label: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'] },
    { code: 'AR', label: 'Arunachal Pradesh', cities: ['Itanagar', 'Tawang', 'Pasighat'] },
    { code: 'AS', label: 'Assam', cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'] },
    { code: 'BR', label: 'Bihar', cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'] },
    { code: 'CH', label: 'Chandigarh', cities: ['Chandigarh'] },
    { code: 'CT', label: 'Chhattisgarh', cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg'] },
    { code: 'DL', label: 'Delhi', cities: ['New Delhi', 'Delhi'] },
    { code: 'GA', label: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'] },
    { code: 'GJ', label: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'] },
    { code: 'HR', label: 'Haryana', cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal'] },
    { code: 'HP', label: 'Himachal Pradesh', cities: ['Shimla', 'Dharamshala', 'Manali', 'Solan'] },
    { code: 'JK', label: 'Jammu and Kashmir', cities: ['Srinagar', 'Jammu', 'Anantnag'] },
    { code: 'JH', label: 'Jharkhand', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'] },
    { code: 'KA', label: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'] },
    { code: 'KL', label: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'] },
    { code: 'LA', label: 'Ladakh', cities: ['Leh', 'Kargil'] },
    { code: 'MP', label: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'] },
    { code: 'MH', label: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad'] },
    { code: 'MN', label: 'Manipur', cities: ['Imphal'] },
    { code: 'ML', label: 'Meghalaya', cities: ['Shillong', 'Tura'] },
    { code: 'MZ', label: 'Mizoram', cities: ['Aizawl'] },
    { code: 'NL', label: 'Nagaland', cities: ['Kohima', 'Dimapur'] },
    { code: 'OR', label: 'Odisha', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri'] },
    { code: 'PY', label: 'Puducherry', cities: ['Puducherry', 'Karaikal'] },
    { code: 'PB', label: 'Punjab', cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali'] },
    { code: 'RJ', label: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'] },
    { code: 'SK', label: 'Sikkim', cities: ['Gangtok'] },
    { code: 'TN', label: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur'] },
    { code: 'TS', label: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'] },
    { code: 'TR', label: 'Tripura', cities: ['Agartala'] },
    { code: 'UP', label: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Varanasi', 'Agra', 'Prayagraj'] },
    { code: 'UK', label: 'Uttarakhand', cities: ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'] },
    { code: 'WB', label: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'] },
  ],
  GB: [
    { code: 'ENG', label: 'England', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Sheffield', 'Newcastle upon Tyne', 'Nottingham', 'Leicester'] },
    { code: 'SCT', label: 'Scotland', cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'] },
    { code: 'WLS', label: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport', 'Wrexham'] },
    { code: 'NIR', label: 'Northern Ireland', cities: ['Belfast', 'Derry', 'Lisburn'] },
  ],
  US: [
    { code: 'CA', label: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'] },
    { code: 'TX', label: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'] },
    { code: 'NY', label: 'New York', cities: ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'] },
    { code: 'FL', label: 'Florida', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'] },
    { code: 'IL', label: 'Illinois', cities: ['Chicago', 'Aurora', 'Naperville', 'Springfield'] },
  ],
  CA: [
    { code: 'ON', label: 'Ontario', cities: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'] },
    { code: 'BC', label: 'British Columbia', cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby'] },
    { code: 'AB', label: 'Alberta', cities: ['Calgary', 'Edmonton', 'Red Deer'] },
    { code: 'QC', label: 'Quebec', cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'] },
  ],
  AU: [
    { code: 'NSW', label: 'New South Wales', cities: ['Sydney', 'Newcastle', 'Wollongong'] },
    { code: 'VIC', label: 'Victoria', cities: ['Melbourne', 'Geelong', 'Ballarat'] },
    { code: 'QLD', label: 'Queensland', cities: ['Brisbane', 'Gold Coast', 'Cairns'] },
    { code: 'WA', label: 'Western Australia', cities: ['Perth', 'Fremantle'] },
  ],
  AE: [
    { code: 'DXB', label: 'Dubai', cities: ['Dubai'] },
    { code: 'AUH', label: 'Abu Dhabi', cities: ['Abu Dhabi'] },
    { code: 'SHJ', label: 'Sharjah', cities: ['Sharjah'] },
  ],
  DE: [
    { code: 'BY', label: 'Bavaria', cities: ['Munich', 'Nuremberg', 'Augsburg'] },
    { code: 'BE', label: 'Berlin', cities: ['Berlin'] },
    { code: 'NW', label: 'North Rhine-Westphalia', cities: ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen'] },
  ],
  FR: [
    { code: 'IDF', label: 'Île-de-France', cities: ['Paris', 'Versailles', 'Boulogne-Billancourt'] },
    { code: 'PAC', label: "Provence-Alpes-Côte d'Azur", cities: ['Marseille', 'Nice', 'Toulon'] },
    { code: 'ARA', label: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Grenoble', 'Saint-Étienne'] },
  ],
  IE: [
    { code: 'L', label: 'Leinster', cities: ['Dublin', 'Kilkenny', 'Wexford'] },
    { code: 'M', label: 'Munster', cities: ['Cork', 'Limerick', 'Waterford'] },
    { code: 'C', label: 'Connacht', cities: ['Galway', 'Sligo'] },
  ],
  SG: [{ code: 'SG', label: 'Singapore', cities: ['Singapore'] }],
  ZA: [
    { code: 'GP', label: 'Gauteng', cities: ['Johannesburg', 'Pretoria', 'Soweto'] },
    { code: 'WC', label: 'Western Cape', cities: ['Cape Town', 'Stellenbosch'] },
    { code: 'KZN', label: 'KwaZulu-Natal', cities: ['Durban', 'Pietermaritzburg'] },
  ],
};

export const ALL_CITIES_VALUE = '__all__';

export function getStatesForCountry(countryCode: string): LocationState[] {
  return MAP_LOCATIONS[countryCode] ?? [];
}

export function getCitiesForState(countryCode: string, stateLabel: string): string[] {
  const state = getStatesForCountry(countryCode).find(
    (s) => s.label === stateLabel || s.code === stateLabel
  );
  return state?.cities ?? [];
}

export function hasLocationDropdowns(countryCode: string): boolean {
  return getStatesForCountry(countryCode).length > 0;
}