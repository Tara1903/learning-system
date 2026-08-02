import re
with open("pages/admin/users.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update UserFormState profile
new_profile_type = """  profile: {
    phone: string;
    section: string;
    admissionNumber: string;
    guardianName: string;
    photoUrl: string;
    dob: string;
    gender: string;
    schoolName: string;
    board: string;
    previousPercentage: string;
    fatherName: string;
    motherName: string;
    parentMobile: string;
    whatsappNumber: string;
    occupation: string;
    address: string;
    city: string;
    pinCode: string;
    subjectsToJoin: string;
    batchTiming: string;
    medium: string;
    weakSubjects: string;
    tuitionStartDate: string;
    medicalCondition: string;
    dateOfAdmission: string;
    feesPlan: string;
    discount: string;
    registrationFee: string;
    receiptNo: string;
    customStudentId: string;
  };"""
content = re.sub(r"  profile: \{\n    phone: string;\n    section: string;\n    admissionNumber: string;\n    guardianName: string;\n  \};", new_profile_type, content)

# 2. Update emptyFormState profile
new_profile_empty = """  profile: {
    phone: "",
    section: "",
    admissionNumber: "",
    guardianName: "",
    photoUrl: "",
    dob: "",
    gender: "",
    schoolName: "",
    board: "",
    previousPercentage: "",
    fatherName: "",
    motherName: "",
    parentMobile: "",
    whatsappNumber: "",
    occupation: "",
    address: "",
    city: "",
    pinCode: "",
    subjectsToJoin: "",
    batchTiming: "",
    medium: "",
    weakSubjects: "",
    tuitionStartDate: "",
    medicalCondition: "",
    dateOfAdmission: "",
    feesPlan: "",
    discount: "",
    registrationFee: "",
    receiptNo: "",
    customStudentId: ""
  }"""
content = re.sub(r"  profile: \{\n    phone: \"\",\n    section: \"\",\n    admissionNumber: \"\",\n    guardianName: \"\"\n  \}", new_profile_empty, content)

# 3. Update toFormState profile
new_profile_map = """    profile: {
      phone: user.profile?.phone ?? "",
      section: user.profile?.section ?? "",
      admissionNumber: user.profile?.admissionNumber ?? "",
      guardianName: user.profile?.guardianName ?? "",
      photoUrl: user.profile?.photoUrl ?? "",
      dob: user.profile?.dob ?? "",
      gender: user.profile?.gender ?? "",
      schoolName: user.profile?.schoolName ?? "",
      board: user.profile?.board ?? "",
      previousPercentage: user.profile?.previousPercentage ?? "",
      fatherName: user.profile?.fatherName ?? "",
      motherName: user.profile?.motherName ?? "",
      parentMobile: user.profile?.parentMobile ?? "",
      whatsappNumber: user.profile?.whatsappNumber ?? "",
      occupation: user.profile?.occupation ?? "",
      address: user.profile?.address ?? "",
      city: user.profile?.city ?? "",
      pinCode: user.profile?.pinCode ?? "",
      subjectsToJoin: user.profile?.subjectsToJoin ?? "",
      batchTiming: user.profile?.batchTiming ?? "",
      medium: user.profile?.medium ?? "",
      weakSubjects: user.profile?.weakSubjects ?? "",
      tuitionStartDate: user.profile?.tuitionStartDate ?? "",
      medicalCondition: user.profile?.medicalCondition ?? "",
      dateOfAdmission: user.profile?.dateOfAdmission ?? "",
      feesPlan: user.profile?.feesPlan ?? "",
      discount: user.profile?.discount ?? "",
      registrationFee: user.profile?.registrationFee ?? "",
      receiptNo: user.profile?.receiptNo ?? "",
      customStudentId: user.profile?.customStudentId ?? ""
    }"""
content = re.sub(r"    profile: \{\n      phone: user\.profile\?\.phone \?\? \"\",\n      section: user\.profile\?\.section \?\? \"\",\n      admissionNumber: user\.profile\?\.admissionNumber \?\? \"\",\n      guardianName: user\.profile\?\.guardianName \?\? \"\"\n    \}", new_profile_map, content)

# 4. Replace form JSX starting from the old formRole === "student" check up to the "parent" linked students check.
form_start = content.find("{formRole === \"student\" ? (")
form_end = content.find("{formRole === \"parent\" ? (")
if form_start == -1 or form_end == -1:
    print("Could not find form jsx delimiters!")
    import sys
    sys.exit(1)

new_form_jsx = """{formRole === "student" ? (
              <div className="space-y-6">
                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">1. Personal Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, dob: e.target.value}}))} placeholder="Date of Birth" value={form.profile.dob} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, gender: e.target.value}}))} value={form.profile.gender}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, photoUrl: e.target.value}}))} placeholder="Photo URL (Optional)" value={form.profile.photoUrl} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">2. Academic Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, class: e.target.value}))} placeholder="Class e.g. 8" value={form.class} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, section: e.target.value}}))} placeholder="Section" value={form.profile.section} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, schoolName: e.target.value}}))} placeholder="School Name" value={form.profile.schoolName} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, board: e.target.value}}))} value={form.profile.board}>
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="MP Board">MP Board</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, previousPercentage: e.target.value}}))} placeholder="Previous Class Percentage/Grade" value={form.profile.previousPercentage} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">3. Tuition Preferences</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, subjectsToJoin: e.target.value}}))} placeholder="Subjects to Join" value={form.profile.subjectsToJoin} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, batchTiming: e.target.value}}))} placeholder="Batch Timing Preference" value={form.profile.batchTiming} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, medium: e.target.value}}))} value={form.profile.medium}>
                      <option value="">Select Medium</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, weakSubjects: e.target.value}}))} placeholder="Weak Subjects" value={form.profile.weakSubjects} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, tuitionStartDate: e.target.value}}))} type="date" placeholder="Tuition Start Date" value={form.profile.tuitionStartDate} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">4. Parent / Guardian Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, fatherName: e.target.value}}))} placeholder="Father's Name" value={form.profile.fatherName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, motherName: e.target.value}}))} placeholder="Mother's Name" value={form.profile.motherName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, guardianName: e.target.value}}))} placeholder="Guardian Name (if applicable)" value={form.profile.guardianName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, parentMobile: e.target.value}}))} placeholder="Parent/Guardian Mobile Number" value={form.profile.parentMobile} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, whatsappNumber: e.target.value}}))} placeholder="WhatsApp Number" value={form.profile.whatsappNumber} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, occupation: e.target.value}}))} placeholder="Occupation (Optional)" value={form.profile.occupation} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">5. Address</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, address: e.target.value}}))} placeholder="Complete Address" value={form.profile.address} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, city: e.target.value}}))} placeholder="City" value={form.profile.city} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, pinCode: e.target.value}}))} placeholder="PIN Code" value={form.profile.pinCode} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">6. Medical & Office Use</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, medicalCondition: e.target.value}}))} placeholder="Any Medical Condition/Allergy (Optional)" value={form.profile.medicalCondition} />
                    
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, admissionNo: e.target.value}}))} placeholder="Admission No. (Office)" value={form.profile.admissionNo} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, dateOfAdmission: e.target.value}}))} type="date" placeholder="Date of Admission (Office)" value={form.profile.dateOfAdmission} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, feesPlan: e.target.value}}))} value={form.profile.feesPlan}>
                      <option value="">Select Fees Plan</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, discount: e.target.value}}))} placeholder="Discount (if any)" value={form.profile.discount} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, registrationFee: e.target.value}}))} placeholder="Registration Fee" value={form.profile.registrationFee} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, receiptNo: e.target.value}}))} placeholder="Receipt No." value={form.profile.receiptNo} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, customStudentId: e.target.value}}))} placeholder="Student ID (Office)" value={form.profile.customStudentId} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        phone: event.target.value
                      }
                    }))
                  }
                  placeholder="Phone number"
                  value={form.profile.phone}
                />
                <input
                  className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        guardianName: event.target.value
                      }
                    }))
                  }
                  placeholder="Guardian or contact name"
                  value={form.profile.guardianName}
                />
              </div>
            )}

            """

content = content[:form_start] + new_form_jsx + content[form_end:]

with open("pages/admin/users.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully")