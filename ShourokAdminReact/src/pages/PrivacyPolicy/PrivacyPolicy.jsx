import { FileText, Shield, Lock, Eye, Globe, Mail, Phone } from 'lucide-react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-page">
      <div className="privacy-policy-container">
        {/* Header */}
        <div className="privacy-header">
          <div className="privacy-icon-wrapper">
            <Shield size={48} className="privacy-icon" />
          </div>
          <h1>Privacy Policy</h1>
          <p className="privacy-subtitle">Shorouk Event App</p>
          <p className="privacy-updated">Last Updated: December 25, 2025</p>
        </div>

        {/* Content */}
        <div className="privacy-content">
          <section className="privacy-section">
            <h2>1. INTRODUCTION</h2>
            <p>
              Shorouk Event App ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our mobile application and related services (collectively, the "Service").
            </p>
            <p>
              Please read this Privacy Policy carefully. By using our Service, you agree to the collection 
              and use of information in accordance with this policy.
            </p>
          </section>

          <section className="privacy-section">
            <h2>2. INFORMATION WE COLLECT</h2>
            
            <h3>2.1 Personal Information</h3>
            <p>We may collect personal information that you provide directly to us, including:</p>
            <ul>
              <li>Name and contact information (email address, phone number)</li>
              <li>Profile information (profile picture, bio)</li>
              <li>Payment information for ticket purchases</li>
              <li>Identification documents for casting applications</li>
              <li>Location data (with your permission)</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>When you use our Service, we may automatically collect certain information, including:</p>
            <ul>
              <li>Device information (device type, operating system, unique device identifiers)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Log data (IP address, browser type, access times)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3>2.3 User-Generated Content</h3>
            <p>We collect content you create or share through our Service, including:</p>
            <ul>
              <li>Event ticket purchases and reservations</li>
              <li>Casting application submissions (photos, videos, personal information)</li>
              <li>Comments, reviews, or feedback</li>
              <li>Video content interactions</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. HOW WE USE YOUR INFORMATION</h2>
            <p>We use the information we collect for various purposes, including:</p>
            <ul>
              <li>To provide, maintain, and improve our Service</li>
              <li>To process ticket purchases and manage event registrations</li>
              <li>To process casting applications and manage talent submissions</li>
              <li>To send you notifications, updates, and promotional materials</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To detect, prevent, and address technical issues</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>4. INFORMATION SHARING AND DISCLOSURE</h2>
            <p>We may share your information in the following circumstances:</p>
            
            <h3>4.1 With Event Organizers</h3>
            <p>We share relevant information with event organizers to facilitate ticket management and event participation.</p>

            <h3>4.2 With Service Providers</h3>
            <p>We may share information with third-party service providers who perform services on our behalf (payment processing, data analytics, cloud storage).</p>

            <h3>4.3 Legal Requirements</h3>
            <p>We may disclose information if required by law or in response to valid requests by public authorities.</p>

            <h3>4.4 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred.</p>
          </section>

          <section className="privacy-section">
            <h2>5. DATA SECURITY</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
              over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="privacy-section">
            <h2>6. DATA RETENTION</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section className="privacy-section">
            <h2>7. YOUR RIGHTS AND CHOICES</h2>
            <p>You have certain rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> You can request access to your personal information</li>
              <li><strong>Correction:</strong> You can update or correct your information through the app settings</li>
              <li><strong>Deletion:</strong> You can request deletion of your personal information</li>
              <li><strong>Opt-out:</strong> You can opt-out of certain communications by adjusting your notification settings</li>
              <li><strong>Data Portability:</strong> You can request a copy of your data in a portable format</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>8. CHILDREN'S PRIVACY</h2>
            <p>
              Our Service is not intended for children under the age of 13. We do not knowingly collect personal 
              information from children under 13. If you are a parent or guardian and believe your child has provided 
              us with personal information, please contact us.
            </p>
          </section>

          <section className="privacy-section">
            <h2>9. INTERNATIONAL DATA TRANSFERS</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have data protection laws that differ from those in your country.
            </p>
          </section>

          <section className="privacy-section">
            <h2>10. THIRD-PARTY LINKS</h2>
            <p>
              Our Service may contain links to third-party websites or services. We are not responsible for the privacy 
              practices of these third parties. We encourage you to read their privacy policies.
            </p>
          </section>

          <section className="privacy-section">
            <h2>11. CALIFORNIA PRIVACY RIGHTS</h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), 
              including the right to know what personal information we collect and the right to opt-out of the sale of 
              personal information.
            </p>
          </section>

          <section className="privacy-section">
            <h2>12. EUROPEAN PRIVACY RIGHTS</h2>
            <p>
              If you are located in the European Economic Area (EEA), you have additional rights under the General Data 
              Protection Regulation (GDPR), including the right to object to processing, the right to restrict processing, 
              and the right to lodge a complaint with a supervisory authority.
            </p>
          </section>

          <section className="privacy-section">
            <h2>13. CHANGES TO THIS PRIVACY POLICY</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
              Policy periodically.
            </p>
          </section>

          <section className="privacy-section">
            <h2>14. CONTACT US</h2>
            <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
            <div className="contact-info">
              <div className="contact-item">
                <Mail size={18} />
                <span>Email: privacy@shoroukevent.com</span>
              </div>
              <div className="contact-item">
                <Phone size={18} />
                <span>Phone: [Your Contact Number]</span>
              </div>
            </div>
          </section>

          <section className="privacy-section">
            <h2>15. CONSENT</h2>
            <p>
              By using our Service, you consent to our Privacy Policy and agree to its terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
