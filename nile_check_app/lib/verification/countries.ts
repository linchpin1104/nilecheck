// Server-side country data
export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

// Countries list available for phone verification
export const countries: Country[] = [
  { code: "KR", name: "Korea, South", flag: "🇰🇷", dialCode: "+82" },
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81" },
  { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dialCode: "+66" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" }
]; 