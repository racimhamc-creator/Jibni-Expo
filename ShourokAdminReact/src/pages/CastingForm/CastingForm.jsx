import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, X, ExternalLink } from 'lucide-react';
import { castingAPI } from '../../services/api';
import './CastingForm.css';

const TOTAL_STEPS = 8;

const ALGERIA_WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa',
  'Biskra', 'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa',
  'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Algiers', 'Djelfa', 'Jijel',
  'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla',
  'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès',
  'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras',
  'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa',
  'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal',
  'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet',
  'El M\'Ghair', 'El Meniaa', 'Aflou', 'Barika', 'Ksar Chellala',
  'Messaad', 'Aïn Oussera', 'Bou Saâda', 'El Abiodh Sidi Cheikh',
  'El Kantara', 'Bir el Ater', 'Ksar El Boukhari', 'El Aricha'
];

const HAIR_LENGTHS = ['قصير / Short', 'متوسط / Medium', 'طويل / Long'];
const WORK_TYPES = [
  { id: 'fashion', label: 'عروض أزياء / Fashion Shows' },
  { id: 'photoshoot', label: 'جلسات تصوير / Photo Shoots' },
  { id: 'ads', label: 'إعلانات / Advertisements' },
  { id: 'videoclip', label: 'فيديو كليب / Video Clips' },
];

const CastingForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1: Personal Information
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');

  // Step 2: Body Measurements
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [chestSize, setChestSize] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [hipSize, setHipSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [hairLength, setHairLength] = useState('');

  // Step 3: Professional Experience
  const [hasPreviousExperience, setHasPreviousExperience] = useState(null);
  const [previousParticipations, setPreviousParticipations] = useState('');
  const [workTypes, setWorkTypes] = useState([]);
  const [designersWorkedWith, setDesignersWorkedWith] = useState('');
  const [belongsToAgency, setBelongsToAgency] = useState(null);
  const [agencyName, setAgencyName] = useState('');

  // Step 4: Photos
  const [facePhoto, setFacePhoto] = useState(null);
  const [fullBodyPhoto, setFullBodyPhoto] = useState(null);
  const [professionalPhotos, setProfessionalPhotos] = useState([]);

  // Step 5: Availability
  const [availableOnDate, setAvailableOnDate] = useState(null);
  const [acceptRehearsals, setAcceptRehearsals] = useState(false);
  const [acceptHighHeels, setAcceptHighHeels] = useState(false);
  const [acceptInstructions, setAcceptInstructions] = useState(false);
  const [readyToTravel, setReadyToTravel] = useState(false);

  // Step 6: Health Information
  const [hasHealthIssues, setHasHealthIssues] = useState('');
  const [hasAllergies, setHasAllergies] = useState('');
  const [canStandLongHours, setCanStandLongHours] = useState(null);

  // Step 7: Terms
  const [acceptPhotoUsage, setAcceptPhotoUsage] = useState(false);
  const [confirmInfoAccuracy, setConfirmInfoAccuracy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptGeneralTerms, setAcceptGeneralTerms] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');

  // Step 8: Electronic Signature
  const [signature, setSignature] = useState(null);
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const calculateAge = (dob) => {
    if (!dob) return null;
    const parts = dob.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    }
    return null;
  };

  const handleBirthDateChange = (e) => {
    const value = e.target.value;
    // Format as DD/MM/YYYY
    let formatted = value.replace(/\D/g, '');
    if (formatted.length >= 2) {
      formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
    }
    if (formatted.length >= 5) {
      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
    }
    setBirthDate(formatted);
    const calculated = calculateAge(formatted);
    if (calculated !== null) {
      setAge(calculated.toString());
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (type === 'face') {
        setFacePhoto(base64);
      } else if (type === 'fullBody') {
        setFullBodyPhoto(base64);
      } else if (type === 'professional') {
        if (professionalPhotos.length < 4) {
          setProfessionalPhotos([...professionalPhotos, base64]);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    setProfessionalPhotos(professionalPhotos.filter((_, i) => i !== index));
  };

  const toggleWorkType = (id) => {
    if (workTypes.includes(id)) {
      setWorkTypes(workTypes.filter(w => w !== id));
    } else {
      setWorkTypes([...workTypes, id]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return fullName.trim() !== '' && birthDate.length === 10 && phone.trim() !== '';
      case 2:
        return height.trim() !== '' && weight.trim() !== '';
      case 3:
        return hasPreviousExperience !== null;
      case 4:
        return facePhoto !== null && fullBodyPhoto !== null;
      case 5:
        return availableOnDate !== null;
      case 6:
        return canStandLongHours !== null;
      case 7:
        return acceptPhotoUsage && confirmInfoAccuracy && acceptTerms && acceptGeneralTerms && confirmationName.trim() !== '';
      case 8:
        return signature !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setErrors({});
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setErrors({ [currentStep]: 'Please complete all required fields' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      setErrors({ [currentStep]: 'Please complete all required fields' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const formData = {
        // Step 1
        fullName,
        birthDate,
        age: parseInt(age) || null,
        wilaya,
        city,
        phone,
        email,
        instagram,
        tiktok,
        // Step 2
        height: parseFloat(height) || null,
        weight: parseFloat(weight) || null,
        chestSize: parseFloat(chestSize) || null,
        waistSize: parseFloat(waistSize) || null,
        hipSize: parseFloat(hipSize) || null,
        shoeSize: parseFloat(shoeSize) || null,
        eyeColor,
        hairColor,
        hairLength,
        // Step 3
        hasPreviousExperience,
        previousParticipations: parseInt(previousParticipations) || 0,
        workTypes,
        designersWorkedWith,
        belongsToAgency,
        agencyName,
        // Step 4
        facePhoto,
        fullBodyPhoto,
        professionalPhotos,
        // Step 5
        availableOnDate,
        acceptRehearsals,
        acceptHighHeels,
        acceptInstructions,
        readyToTravel,
        // Step 6
        hasHealthIssues,
        hasAllergies,
        canStandLongHours,
        // Step 7
        acceptPhotoUsage,
        confirmInfoAccuracy,
        acceptTerms,
        acceptGeneralTerms,
        confirmationName,
        // Step 8
        signature,
      };

      const response = await castingAPI.submit(formData);
      
      if (response.data.success) {
        setSubmitSuccess(true);
      } else {
        setErrors({ submit: response.data.message || 'Failed to submit application' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ 
        submit: error.response?.data?.message || 'An error occurred while submitting your application' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize signature canvas
  useEffect(() => {
    if (currentStep === 8 && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#00d4aa';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [currentStep]);

  // Signature canvas handlers
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = signatureCanvasRef.current;
      if (canvas) {
        setSignature(canvas.toDataURL());
      }
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
    }
  };

  if (submitSuccess) {
    return (
      <div className="casting-form-container">
        <div className="casting-success">
          <div className="success-icon">
            <Check size={64} />
          </div>
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you for your application. We will review it and get back to you soon.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="casting-form-container" style={{ overflow: currentStep === 8 ? 'hidden' : 'auto' }}>
      <div className="casting-form-header">
        <h1>Casting Application</h1>
        <p>استمارة التقديم للكاستينغ / Formulaire de candidature au casting</p>
        <p className="header-subtitle">Complete all 8 steps to submit your application</p>
      </div>

      {/* Stepper */}
      <div className="casting-stepper">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div key={step} className="stepper-item">
            <div className={`stepper-circle ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
              {currentStep > step ? <Check size={16} /> : <span>{step}</span>}
            </div>
            {step < TOTAL_STEPS && (
              <div className={`stepper-line ${currentStep > step ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="casting-form-content" style={{ overflow: currentStep === 8 ? 'hidden' : 'auto' }}>
        {errors.submit && (
          <div className="error-message">{errors.submit}</div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 1: المعلومات الشخصية</h2>
            <h2 className="section-title-fr">Section 1: Informations Personnelles</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>الاسم الكامل / Nom Complet *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Entrez votre nom complet"
                />
              </div>
              <div className="form-group">
                <label>تاريخ الميلاد / Date de Naissance *</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  placeholder="JJ/MM/AAAA"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>العمر / Âge</label>
                <input
                  type="number"
                  value={age}
                  readOnly
                  placeholder="Calculé automatiquement"
                />
              </div>
              <div className="form-group">
                <label>الولاية / Wilaya</label>
                <select value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
                  <option value="">Sélectionnez une wilaya</option>
                  {ALGERIA_WILAYAS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>المدينة / Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Votre ville"
                />
              </div>
              <div className="form-group">
                <label>رقم الهاتف / Téléphone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213 XX XXX XXXX"
                />
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني / Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
              <div className="form-group">
                <label>رابط Instagram (اختياري)</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@votre_instagram"
                />
              </div>
              <div className="form-group">
                <label>رابط TikTok (اختياري)</label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@votre_tiktok"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Body Measurements */}
        {currentStep === 2 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 2: المقاسات الجسدية</h2>
            <h2 className="section-title-fr">Section 2: Mensurations</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>الطول / Taille *</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="170"
                />
                <span className="unit-text">cm</span>
              </div>
              <div className="form-group">
                <label>الوزن / Poids *</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="55"
                />
                <span className="unit-text">kg</span>
              </div>
              <div className="form-group">
                <label>مقاس الصدر / Poitrine</label>
                <input
                  type="number"
                  value={chestSize}
                  onChange={(e) => setChestSize(e.target.value)}
                  placeholder="85"
                />
                <span className="unit-text">cm</span>
              </div>
              <div className="form-group">
                <label>مقاس الخصر / Taille</label>
                <input
                  type="number"
                  value={waistSize}
                  onChange={(e) => setWaistSize(e.target.value)}
                  placeholder="60"
                />
                <span className="unit-text">cm</span>
              </div>
              <div className="form-group">
                <label>مقاس الورك / Hanches</label>
                <input
                  type="number"
                  value={hipSize}
                  onChange={(e) => setHipSize(e.target.value)}
                  placeholder="90"
                />
                <span className="unit-text">cm</span>
              </div>
              <div className="form-group">
                <label>مقاس الحذاء / Pointure</label>
                <input
                  type="number"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="38"
                />
              </div>
              <div className="form-group">
                <label>لون العينين / Couleur des Yeux</label>
                <input
                  type="text"
                  value={eyeColor}
                  onChange={(e) => setEyeColor(e.target.value)}
                  placeholder="Couleur des yeux"
                />
              </div>
              <div className="form-group">
                <label>لون الشعر / Couleur des Cheveux</label>
                <input
                  type="text"
                  value={hairColor}
                  onChange={(e) => setHairColor(e.target.value)}
                  placeholder="Couleur des cheveux"
                />
              </div>
              <div className="form-group">
                <label>طول الشعر / Longueur des Cheveux</label>
                <select value={hairLength} onChange={(e) => setHairLength(e.target.value)}>
                  <option value="">Sélectionnez la longueur</option>
                  {HAIR_LENGTHS.map((hl) => (
                    <option key={hl} value={hl}>{hl}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Professional Experience */}
        {currentStep === 3 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 3: الخبرة المهنية</h2>
            <h2 className="section-title-fr">Section 3: Expérience Professionnelle</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>هل لديكِ خبرة سابقة في عروض الأزياء؟ *</label>
                <label className="label-fr">Avez-vous de l'expérience dans les défilés? *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hasPreviousExperience"
                      value="true"
                      checked={hasPreviousExperience === true}
                      onChange={() => setHasPreviousExperience(true)}
                    />
                    نعم / Oui
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hasPreviousExperience"
                      value="false"
                      checked={hasPreviousExperience === false}
                      onChange={() => setHasPreviousExperience(false)}
                    />
                    لا / Non
                  </label>
                </div>
              </div>
              {hasPreviousExperience && (
                <>
                  <div className="form-group">
                    <label>عدد المشاركات السابقة / Participations</label>
                    <input
                      type="number"
                      value={previousParticipations}
                      onChange={(e) => setPreviousParticipations(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>نوع الأعمال / Type de travaux</label>
                    <div className="checkbox-group">
                      {WORK_TYPES.map((wt) => (
                        <label key={wt.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={workTypes.includes(wt.id)}
                            onChange={() => toggleWorkType(wt.id)}
                          />
                          {wt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>أسماء مصممين أو علامات عملتِ معهم</label>
                    <label className="label-fr">Designers/Marques avec qui vous avez travaillé</label>
                    <input
                      type="text"
                      value={designersWorkedWith}
                      onChange={(e) => setDesignersWorkedWith(e.target.value)}
                      placeholder="Noms des designers..."
                    />
                  </div>
                </>
              )}
              <div className="form-group full-width">
                <label>هل أنتِ منتمية لوكالة؟</label>
                <label className="label-fr">Êtes-vous affiliée à une agence?</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="belongsToAgency"
                      value="true"
                      checked={belongsToAgency === true}
                      onChange={() => setBelongsToAgency(true)}
                    />
                    نعم / Oui
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="belongsToAgency"
                      value="false"
                      checked={belongsToAgency === false}
                      onChange={() => setBelongsToAgency(false)}
                    />
                    لا / Non
                  </label>
                </div>
              </div>
              {belongsToAgency && (
                <div className="form-group">
                  <label>اسم الوكالة / Nom de l'agence</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Nom de l'agence"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {currentStep === 4 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 4: الصور</h2>
            <h2 className="section-title-fr">Section 4: Photos</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>صورة الوجه / Photo du Visage *</label>
                <div className="photo-upload">
                  {facePhoto ? (
                    <div className="photo-preview">
                      <img src={facePhoto} alt="Face" />
                      <button type="button" onClick={() => setFacePhoto(null)} className="remove-photo">
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-area">
                      <Upload size={24} />
                      <span>Cliquez pour télécharger la photo du visage</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'face')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>صورة الجسم الكامل / Photo du Corps Entier *</label>
                <div className="photo-upload">
                  {fullBodyPhoto ? (
                    <div className="photo-preview">
                      <img src={fullBodyPhoto} alt="Full Body" />
                      <button type="button" onClick={() => setFullBodyPhoto(null)} className="remove-photo">
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-area">
                      <Upload size={24} />
                      <span>Cliquez pour télécharger la photo du corps entier</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'fullBody')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="form-group full-width">
                <label>صور احترافية (حتى 4) / Photos Professionnelles (jusqu'à 4)</label>
                <div className="professional-photos-grid">
                  {professionalPhotos.map((photo, index) => (
                    <div key={index} className="photo-preview">
                      <img src={photo} alt={`Professional ${index + 1}`} />
                      <button type="button" onClick={() => removePhoto(index)} className="remove-photo">
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  {professionalPhotos.length < 4 && (
                    <label className="upload-area small">
                      <Upload size={20} />
                      <span>Ajouter une photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'professional')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Availability */}
        {currentStep === 5 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 5: التوفر</h2>
            <h2 className="section-title-fr">Section 5: Disponibilité</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>هل أنتِ متوفرة في تاريخ الحدث؟ *</label>
                <label className="label-fr">Êtes-vous disponible à la date de l'événement? *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="availableOnDate"
                      value="true"
                      checked={availableOnDate === true}
                      onChange={() => setAvailableOnDate(true)}
                    />
                    نعم / Oui
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="availableOnDate"
                      value="false"
                      checked={availableOnDate === false}
                      onChange={() => setAvailableOnDate(false)}
                    />
                    لا / Non
                  </label>
                </div>
              </div>
              <div className="form-group full-width">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptRehearsals}
                      onChange={(e) => setAcceptRehearsals(e.target.checked)}
                    />
                    أوافق على حضور البروفات / J'accepte d'assister aux répétitions
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptHighHeels}
                      onChange={(e) => setAcceptHighHeels(e.target.checked)}
                    />
                    يمكنني ارتداء الكعب العالي / Je peux porter des talons hauts
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptInstructions}
                      onChange={(e) => setAcceptInstructions(e.target.checked)}
                    />
                    أوافق على اتباع التعليمات / J'accepte de suivre les instructions
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={readyToTravel}
                      onChange={(e) => setReadyToTravel(e.target.checked)}
                    />
                    أنا مستعدة للسفر إذا لزم الأمر / Je suis prête à voyager si nécessaire
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Health Information */}
        {currentStep === 6 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 6: المعلومات الصحية</h2>
            <h2 className="section-title-fr">Section 6: Informations de Santé</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>مشاكل صحية / Problèmes de Santé</label>
                <textarea
                  value={hasHealthIssues}
                  onChange={(e) => setHasHealthIssues(e.target.value)}
                  placeholder="Décrivez tout problème de santé (laissez vide si aucun)"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>حساسيات / Allergies</label>
                <textarea
                  value={hasAllergies}
                  onChange={(e) => setHasAllergies(e.target.value)}
                  placeholder="Listez les allergies (laissez vide si aucune)"
                  rows={3}
                />
              </div>
              <div className="form-group full-width">
                <label>هل يمكنك الوقوف لساعات طويلة؟ *</label>
                <label className="label-fr">Pouvez-vous rester debout pendant de longues heures? *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="canStandLongHours"
                      value="true"
                      checked={canStandLongHours === true}
                      onChange={() => setCanStandLongHours(true)}
                    />
                    نعم / Oui
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="canStandLongHours"
                      value="false"
                      checked={canStandLongHours === false}
                      onChange={() => setCanStandLongHours(false)}
                    />
                    لا / Non
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Terms */}
        {currentStep === 7 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 7: الشروط والأحكام</h2>
            <h2 className="section-title-fr">Section 7: Termes et Conditions</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptPhotoUsage}
                      onChange={(e) => setAcceptPhotoUsage(e.target.checked)}
                    />
                    <span>
                      أوافق على استخدام صوري لأغراض ترويجية *{'\n'}
                      <span className="label-fr">J'accepte que mes photos puissent être utilisées à des fins promotionnelles *</span>
                    </span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmInfoAccuracy}
                      onChange={(e) => setConfirmInfoAccuracy(e.target.checked)}
                    />
                    <span>
                      أؤكد أن جميع المعلومات المقدمة دقيقة *{'\n'}
                      <span className="label-fr">Je confirme que toutes les informations fournies sont exactes *</span>
                    </span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />
                    <span>
                      أوافق على شروط المشاركة في الكاستينغ *{'\n'}
                      <span className="label-fr">J'accepte les conditions de participation au casting *</span>
                    </span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptGeneralTerms}
                      onChange={(e) => setAcceptGeneralTerms(e.target.checked)}
                    />
                    <div className="terms-checkbox-content">
                      <span>
                        أوافق على الشروط والأحكام *{'\n'}
                        <span className="label-fr">J'accepte les Termes et Conditions *</span>
                      </span>
                      <a 
                        href="/terms" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="terms-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        اقرأ الشروط والأحكام / Lire les Termes et Conditions
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>اسم التأكيد / Nom de Confirmation *</label>
                <input
                  type="text"
                  value={confirmationName}
                  onChange={(e) => setConfirmationName(e.target.value)}
                  placeholder="Entrez votre nom complet pour confirmer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Electronic Signature */}
        {currentStep === 8 && (
          <div className="form-step">
            <h2 className="section-title-ar">القسم 8: التوقيع الإلكتروني</h2>
            <h2 className="section-title-fr">Section 8: Signature Électronique</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>التوقيع الإلكتروني *</label>
                <label className="label-fr">Signature électronique (obligatoire) *</label>
                <div className="signature-container">
                  <canvas
                    ref={signatureCanvasRef}
                    width={600}
                    height={200}
                    className="signature-canvas"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startDrawing(e);
                    }}
                    onMouseMove={(e) => {
                      e.preventDefault();
                      draw(e);
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      stopDrawing();
                    }}
                    onMouseLeave={(e) => {
                      e.preventDefault();
                      stopDrawing();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        touches: [touch],
                        preventDefault: () => {},
                      };
                      startDrawing(fakeEvent);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        touches: [touch],
                        preventDefault: () => {},
                      };
                      draw(fakeEvent);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      stopDrawing();
                    }}
                  />
                  <div className="signature-actions">
                    <button type="button" onClick={clearSignature} className="btn-secondary">
                      مسح / Effacer
                    </button>
                  </div>
                  {signature && (
                    <div className="signature-preview">
                      <img src={signature} alt="Signature preview" />
                    </div>
                  )}
                  <div className="signature-info-note">
                    <span>استخدم إصبعك أو قلم للرسم لرسم توقيعك</span>
                    <span className="label-fr">Utilisez votre doigt ou un stylet pour dessiner votre signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Navigation Buttons */}
      <div className="casting-form-navigation">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="btn-secondary"
        >
          <ArrowLeft size={20} />
          Previous
        </button>
        {currentStep < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="btn-primary"
          >
            Next
            <ArrowRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || loading}
            className="btn-primary"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CastingForm;

