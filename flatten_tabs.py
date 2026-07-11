import re

filepath = r'd:\perobaan\17\neurodent-main\src\components\medical-record\MedicalRecordForm.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove line 727 (the orphaned </div> before TAB 2)
# We look for the section:
target1 = """                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              TAB 2:"""
replacement1 = """                  )}
                </div>
              </div>
            </div>

          {/* ═════════════════════════════════════════════════════════════════
              TAB 2:"""
content = content.replace(target1, replacement1)

# 2. Remove line 732 (the wrapper for TAB 2)
target2 = """              TAB 2: ODONTOGRAM & DIAGNOSIS (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Odontogram Section */}"""
replacement2 = """              TAB 2: ODONTOGRAM & DIAGNOSIS (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
            {/* Odontogram Section */}"""
content = content.replace(target2, replacement2)

# 3. Remove line 791 (closing TAB 2) and line 796 (opening TAB 3)
target3 = """            />
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              TAB 3: BERKAS & RUJUKAN (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* PATIENT MEDIA UPLOAD SECTION */}"""
replacement3 = """            />

          {/* ═════════════════════════════════════════════════════════════════
              TAB 3: BERKAS & RUJUKAN (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
            {/* PATIENT MEDIA UPLOAD SECTION */}"""
content = content.replace(target3, replacement3)

# 4. Remove line 853 (closing TAB 3)
target4 = """                )}
              </div>
            </div>
          </div>

        </div>
      {/* Pinned action wrapper for saving / printing */}"""
replacement4 = """                )}
              </div>
            </div>

        </div>
      {/* Pinned action wrapper for saving / printing */}"""
content = content.replace(target4, replacement4)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Flattened wrappers successfully.")
