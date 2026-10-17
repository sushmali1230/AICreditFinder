import React, { useState } from 'react';
import { UserPlus, AlertCircle, X, Building, Briefcase } from 'lucide-react';
import { api } from '../../services/api';
import { Customer, EmploymentType } from '../../types';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (newCustomer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1988-05-12');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('SALARIED');
  const [employerOrBusiness, setEmployerOrBusiness] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('400001');
  const [creditScore, setCreditScore] = useState<number>(740);
  const [requestedLoanAmount, setRequestedLoanAmount] = useState<number>(2000000);
  const [requestedLoanTenureMonths, setRequestedLoanTenureMonths] = useState<number>(60);
  const [requestedLoanPurpose, setRequestedLoanPurpose] = useState('Business Expansion & Inventory');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        fullName,
        email,
        phone,
        panNumber: panNumber.trim().toUpperCase(),
        aadhaar,
        dateOfBirth,
        employmentType,
        employerName: employmentType === 'SALARIED' ? employerOrBusiness : undefined,
        businessName: employmentType !== 'SALARIED' ? employerOrBusiness : undefined,
        address,
        city,
        state,
        pincode,
        creditScore: Number(creditScore),
        requestedLoanAmount: Number(requestedLoanAmount),
        requestedLoanTenureMonths: Number(requestedLoanTenureMonths),
        requestedLoanPurpose,
      };

      const res = await api.customers.create(payload);
      onCustomerCreated(res.customer);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl border border-slate-700 p-4 sm:p-6 w-full max-w-2xl shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                Register New Loan Application
              </h3>
              <p className="text-xs text-slate-400">
                Create commercial/retail borrower profile for credit analysis
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Row 1: Name, Email, Phone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-medium">Borrower Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kulkarni"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Email Address *</label>
              <input
                type="email"
                placeholder="borrower@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Phone Number *</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: PAN, Aadhaar, DOB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-medium">Indian PAN Number *</label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                maxLength={10}
                required
                className="mt-1 w-full font-mono font-bold tracking-wider rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Aadhaar Number (Masked)</label>
              <input
                type="text"
                placeholder="•••• •••• 9812"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Employment Type & Employer Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium">Employment Type *</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="SALARIED">Salaried Corporate Executive</option>
                <option value="SELF_EMPLOYED_BUSINESS">Self-Employed (Business / Enterprise)</option>
                <option value="SELF_EMPLOYED_PROFESSIONAL">Self-Employed (Doctor/CA/Consultant)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium">
                {employmentType === 'SALARIED' ? 'Employer Company Name' : 'Business Enterprise Name'}
              </label>
              <input
                type="text"
                placeholder={employmentType === 'SALARIED' ? 'e.g. Tata Consultancy Services' : 'e.g. Kulkarni Electronics'}
                value={employerOrBusiness}
                onChange={(e) => setEmployerOrBusiness(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Address, City, State, Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-slate-300 font-medium">Residential / Office Address *</label>
              <input
                type="text"
                placeholder="Flat / Building, Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Pincode *</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Bureau Score, Requested Loan Amount, Tenure, Purpose */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-medium">CIBIL Bureau Score (300-900) *</label>
              <input
                type="number"
                min={300}
                max={900}
                value={creditScore}
                onChange={(e) => setCreditScore(Number(e.target.value))}
                required
                className="mt-1 w-full font-bold rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Requested Loan Amount (₹) *</label>
              <input
                type="number"
                step={50000}
                value={requestedLoanAmount}
                onChange={(e) => setRequestedLoanAmount(Number(e.target.value))}
                required
                className="mt-1 w-full font-bold text-emerald-400 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Requested Tenure (Months) *</label>
              <input
                type="number"
                value={requestedLoanTenureMonths}
                onChange={(e) => setRequestedLoanTenureMonths(Number(e.target.value))}
                required
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: Loan Purpose */}
          <div>
            <label className="text-slate-300 font-medium">Loan Purpose / Facility Detail *</label>
            <input
              type="text"
              placeholder="e.g. Working Capital, Equipment Purchase, Home Extension"
              value={requestedLoanPurpose}
              onChange={(e) => setRequestedLoanPurpose(e.target.value)}
              required
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-950/50 border border-rose-500/30 p-2.5 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-slate-300 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 font-semibold text-white shadow-lg transition-all"
            >
              {isSubmitting ? 'Creating Profile...' : 'Register Applicant Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
