import { Mail, Phone, MessageSquare, MapPin, Send, Clock } from 'lucide-react';
import './Contact.css';

const Contact = () => {
  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Header */}
        <div className="contact-header">
          <div className="contact-icon-wrapper">
            <MessageSquare size={48} className="contact-icon" />
          </div>
          <h1>Contact Us</h1>
          <p className="contact-subtitle">Shorouk Event App</p>
          <p className="contact-description">
            Have questions or need support? We're here to help!
          </p>
        </div>

        {/* Contact Methods */}
        <div className="contact-methods">
          <div className="contact-card">
            <div className="contact-card-icon">
              <Mail size={32} />
            </div>
            <h3>Email Support</h3>
            <p>Send us an email and we'll get back to you as soon as possible.</p>
            <a href="mailto:support@shoroukevent.com" className="contact-link">
              support@shoroukevent.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <Phone size={32} />
            </div>
            <h3>Phone Support</h3>
            <p>Call us during business hours for immediate assistance.</p>
            <a href="tel:+1234567890" className="contact-link">
              +1 (234) 567-890
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <Clock size={32} />
            </div>
            <h3>Business Hours</h3>
            <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
            <p>Saturday: 10:00 AM - 4:00 PM</p>
            <p>Sunday: Closed</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="contact-form-section">
          <h2>Send us a Message</h2>
          <form className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input type="text" id="name" name="name" placeholder="Enter your name" required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Your Email</label>
              <input type="email" id="email" name="email" placeholder="Enter your email" required />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input type="text" id="subject" name="subject" placeholder="What is this regarding?" required />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea 
                id="message" 
                name="message" 
                rows="6" 
                placeholder="Tell us how we can help you..."
                required
              ></textarea>
            </div>

            <button type="submit" className="submit-button">
              <Send size={18} />
              Send Message
            </button>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>How do I download the app?</h3>
            <p>
              You can download the Shorouk Event App from the App Store (iOS) or Google Play Store (Android). 
              Visit our <a href="/landing">landing page</a> for direct download links.
            </p>
          </div>

          <div className="faq-item">
            <h3>How do I purchase event tickets?</h3>
            <p>
              Browse available events in the app, select the event you want to attend, 
              choose your tickets, and complete the purchase securely through the app.
            </p>
          </div>

          <div className="faq-item">
            <h3>How do I apply for casting?</h3>
            <p>
              Navigate to the Casting section in the app, fill out the application form, 
              upload required photos/videos, and submit your application. Our team will review it and get back to you.
            </p>
          </div>

          <div className="faq-item">
            <h3>How can I delete my account?</h3>
            <p>
              You can delete your account by visiting our <a href="/delete-account">Delete Account</a> page 
              and following the instructions provided.
            </p>
          </div>

          <div className="faq-item">
            <h3>Is my personal information secure?</h3>
            <p>
              Yes, we take your privacy seriously. Please review our <a href="/privacy-policy">Privacy Policy</a> 
              to learn more about how we protect your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

