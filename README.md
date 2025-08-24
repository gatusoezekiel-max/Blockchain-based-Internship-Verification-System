# 🌟 Blockchain-based Internship Verification System

Welcome to a decentralized solution for tracking and verifying internship experiences on the Stacks blockchain using Clarity smart contracts. This project ensures the authenticity of internship records, prevents fraud, and provides a transparent, immutable ledger for employers, interns, and organizations to verify credentials.

## ✨ Features

🔒 Securely register internship experiences with unique identifiers  
📅 Immutable timestamp for start and end dates  
📋 Store detailed internship metadata (company, role, skills, etc.)  
✅ Verify internship authenticity instantly  
🚫 Prevent fraudulent or duplicate internship claims  
🔄 Allow updates to internship records (with authorization)  
👥 Multi-party verification (intern, employer, and third-party validators)  
📜 Generate verifiable internship certificates on-chain  

## 🛠 How It Works

### For Interns
- Register your internship by calling `register-internship` with:
  - A unique internship ID (hash of key details)
  - Company name, role, start/end dates, and skills acquired
- Request employer validation via `request-employer-approval`
- Receive a verifiable certificate on-chain after validation

### For Employers
- Validate internship details using `approve-internship`
- Update records if needed (e.g., extended internship) via `update-internship`
- Revoke fraudulent claims with `revoke-internship` (if authorized)

### For Verifiers (e.g., Hiring Managers, Universities)
- Use `get-internship-details` to retrieve internship metadata
- Call `verify-internship` to confirm authenticity and ownership
- Check certificate validity with `get-certificate`

### For Third-Party Validators (Optional)
- Register as a validator using `register-validator`
- Provide additional verification for disputed records via `validate-dispute`

## 📂 Smart Contracts (8 Total)

1. **InternshipRegistry.clar**  
   - Registers new internships with a unique ID (SHA-256 hash of details).  
   - Stores metadata like intern principal, company, role, dates, and skills.  
   - Prevents duplicate registrations.

2. **EmployerApproval.clar**  
   - Handles employer approval or rejection of internship records.  
   - Ensures only authorized employers can approve or update records.

3. **InternshipVerification.clar**  
   - Allows third parties to verify internship authenticity.  
   - Returns metadata and validation status.

4. **CertificateGenerator.clar**  
   - Issues immutable on-chain certificates upon successful verification.  
   - Stores certificate details (e.g., intern principal, issuance date).

5. **DisputeResolution.clar**  
   - Manages disputes over internship validity.  
   - Allows registered validators to review and resolve disputes.

6. **ValidatorRegistry.clar**  
   - Registers and manages third-party validators (e.g., universities, agencies).  
   - Tracks validator reputation and permissions.

7. **InternshipUpdates.clar**  
   - Enables authorized updates to internship records (e.g., extending end date).  
   - Logs all changes for transparency.

8. **RevocationHandler.clar**  
   - Allows authorized parties (e.g., employers) to revoke fraudulent records.  
   - Maintains a record of revoked internships for transparency.

## 🚀 Getting Started

### Prerequisites
- [Stacks CLI](https://docs.stacks.co/stacks-101/stacks-cli) for deploying Clarity contracts
- A Stacks wallet for interacting with the blockchain
- Node.js for local development (optional)

### Deployment
1. Clone this repository:
   ```bash
   git clone https://github.com/your-repo/internship-verification.git
   ```
2. Navigate to the project directory and install dependencies:
   ```bash
   npm install
   ```
3. Deploy the smart contracts to the Stacks testnet:
   ```bash
   stacks deploy ./contracts/*.clar
   ```

### Usage
- **Register an Internship**: Call `register-internship` in `InternshipRegistry.clar` with internship details.
- **Approve an Internship**: Employers call `approve-internship` in `EmployerApproval.clar`.
- **Verify an Internship**: Use `verify-internship` in `InternshipVerification.clar` to check authenticity.
- **Generate a Certificate**: Call `issue-certificate` in `CertificateGenerator.clar` after approval.

## 🔐 Security Features
- Only authorized employers can approve or update records.
- Immutable timestamps ensure accurate record-keeping.
- Cryptographic hashes prevent tampering with internship details.
- Dispute resolution ensures fairness and transparency.

## 📈 Future Enhancements
- Integration with decentralized identity (DID) for enhanced intern privacy.
- Support for cross-chain verification with other blockchains.
- UI dashboard for interns, employers, and verifiers to interact with the system.

## 🧑‍💻 Contributing
We welcome contributions! Please submit pull requests or open issues on the [GitHub repository](https://github.com/your-repo/internship-verification).

## 📜 License
This project is licensed under the MIT License.
