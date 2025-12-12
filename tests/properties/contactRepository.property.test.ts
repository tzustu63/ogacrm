import * as fc from 'fast-check';
import { Pool } from 'pg';
import { SchoolRepository, CreateSchoolData } from '../../src/repositories/schoolRepository';
import { ContactRepository, CreateContactData, UpdateContactData } from '../../src/repositories/contactRepository';
import { Contact, SchoolType, RelationshipStatus } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase, getTestPool } from '../setup';

describe('Contact Repository Property Tests', () => {
  let pool: Pool;
  let schoolRepository: SchoolRepository;
  let contactRepository: ContactRepository;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping ContactRepository property tests - database not available');
      return;
    }
    
    pool = await setupTestDatabase();
    schoolRepository = new SchoolRepository(pool);
    contactRepository = new ContactRepository(pool);
  });

  beforeEach(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') return;
    await cleanupTestDatabase();
  });

  /**
   * **Feature: recruitment-crm, Property 3: 聯絡人關聯一致性**
   * 對於任何學校和其聯絡人，當創建、更新或查詢聯絡人時，系統應該正確維護學校與聯絡人之間的關聯關係
   * **Validates: Requirements 2.1, 2.3, 2.4, 2.5**
   */
  it('should maintain contact-school association consistency for create operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType)),
            website: fc.option(fc.webUrl(), { nil: undefined }),
            relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
          }),
          // Contact data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            isPrimary: fc.option(fc.boolean(), { nil: undefined })
          })
        ),
        async ([schoolData, contactData]: [CreateSchoolData, Omit<CreateContactData, 'schoolId'>]) => {
          // Create school first
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create contact associated with the school
          const contactWithSchoolId: CreateContactData = {
            ...contactData,
            schoolId: createdSchool.id
          };
          
          const createdContact = await contactRepository.create(contactWithSchoolId);
          
          // Verify contact is properly associated with school
          expect(createdContact).toBeDefined();
          expect(createdContact.id).toBeDefined();
          expect(createdContact.schoolId).toBe(createdSchool.id);
          expect(createdContact.name).toBe(contactData.name);
          expect(createdContact.email).toBe(contactData.email);
          expect(createdContact.phone).toBe(contactData.phone || null);
          expect(createdContact.position).toBe(contactData.position || null);
          expect(typeof createdContact.isPrimary).toBe('boolean');
          
          // Verify contact can be retrieved by school ID
          const contactsBySchool = await contactRepository.findBySchoolId(createdSchool.id);
          expect(contactsBySchool.length).toBe(1);
          expect(contactsBySchool[0]!.id).toBe(createdContact.id);
          expect(contactsBySchool[0]!.schoolId).toBe(createdSchool.id);
          
          // Verify contact can be retrieved by ID
          const retrievedContact = await contactRepository.findById(createdContact.id);
          expect(retrievedContact).toBeDefined();
          expect(retrievedContact!.schoolId).toBe(createdSchool.id);
          expect(retrievedContact!.name).toBe(createdContact.name);
          expect(retrievedContact!.email).toBe(createdContact.email);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain primary contact consistency across multiple contacts', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Multiple contacts
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              email: fc.emailAddress(),
              phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
              position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isPrimary: fc.boolean()
            }),
            { minLength: 2, maxLength: 5 }
          )
        ),
        async ([schoolData, contactsData]: [CreateSchoolData, Array<Omit<CreateContactData, 'schoolId'>>]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create contacts
          const createdContacts: Contact[] = [];
          for (const contactData of contactsData) {
            const contactWithSchoolId: CreateContactData = {
              ...contactData,
              schoolId: createdSchool.id
            };
            
            const contact = await contactRepository.create(contactWithSchoolId);
            createdContacts.push(contact);
          }
          
          // Verify all contacts are associated with the school
          const allContacts = await contactRepository.findBySchoolId(createdSchool.id);
          expect(allContacts.length).toBe(createdContacts.length);
          
          // Verify only one contact can be primary
          const primaryContacts = allContacts.filter(c => c.isPrimary);
          expect(primaryContacts.length).toBeLessThanOrEqual(1);
          
          // If any contact was set as primary, verify it's the last one set
          let lastPrimaryRequest = -1;
          for (let i = contactsData.length - 1; i >= 0; i--) {
            if (contactsData[i]!.isPrimary) {
              lastPrimaryRequest = i;
              break;
            }
          }
          
          if (lastPrimaryRequest >= 0) {
            expect(primaryContacts.length).toBe(1);
            expect(primaryContacts[0]!.name).toBe(contactsData[lastPrimaryRequest]!.name);
          }
          
          // Verify all contacts have correct school association
          for (const contact of allContacts) {
            expect(contact.schoolId).toBe(createdSchool.id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain association consistency during update operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Initial contact data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            isPrimary: fc.boolean()
          }),
          // Update data
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
            phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            isPrimary: fc.option(fc.boolean(), { nil: undefined })
          })
        ),
        async ([schoolData, contactData, updateData]: [CreateSchoolData, Omit<CreateContactData, 'schoolId'>, UpdateContactData]) => {
          // Create school and contact
          const createdSchool = await schoolRepository.create(schoolData);
          const contactWithSchoolId: CreateContactData = {
            ...contactData,
            schoolId: createdSchool.id
          };
          const createdContact = await contactRepository.create(contactWithSchoolId);
          
          // Update contact
          const updatedContact = await contactRepository.update(createdContact.id, updateData);
          
          expect(updatedContact).toBeDefined();
          
          // Verify school association is maintained
          expect(updatedContact!.schoolId).toBe(createdSchool.id);
          expect(updatedContact!.id).toBe(createdContact.id);
          
          // Verify updated fields
          if (updateData.name !== undefined) {
            expect(updatedContact!.name).toBe(updateData.name);
          } else {
            expect(updatedContact!.name).toBe(createdContact.name);
          }
          
          if (updateData.email !== undefined) {
            expect(updatedContact!.email).toBe(updateData.email);
          } else {
            expect(updatedContact!.email).toBe(createdContact.email);
          }
          
          // Verify contact is still findable by school ID
          const contactsBySchool = await contactRepository.findBySchoolId(createdSchool.id);
          expect(contactsBySchool.length).toBe(1);
          expect(contactsBySchool[0]!.id).toBe(createdContact.id);
          expect(contactsBySchool[0]!.schoolId).toBe(createdSchool.id);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain referential integrity when school is deleted', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Contacts data
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              email: fc.emailAddress(),
              phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
              position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isPrimary: fc.boolean()
            }),
            { minLength: 1, maxLength: 3 }
          )
        ),
        async ([schoolData, contactsData]: [CreateSchoolData, Array<Omit<CreateContactData, 'schoolId'>>]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create contacts
          const createdContacts: Contact[] = [];
          for (const contactData of contactsData) {
            const contactWithSchoolId: CreateContactData = {
              ...contactData,
              schoolId: createdSchool.id
            };
            const contact = await contactRepository.create(contactWithSchoolId);
            createdContacts.push(contact);
          }
          
          // Verify contacts exist
          const contactsBeforeDelete = await contactRepository.findBySchoolId(createdSchool.id);
          expect(contactsBeforeDelete.length).toBe(createdContacts.length);
          
          // Delete school (should cascade delete contacts due to foreign key constraint)
          const deleteResult = await schoolRepository.delete(createdSchool.id);
          expect(deleteResult).toBe(true);
          
          // Verify contacts are also deleted (referential integrity)
          const contactsAfterDelete = await contactRepository.findBySchoolId(createdSchool.id);
          expect(contactsAfterDelete.length).toBe(0);
          
          // Verify individual contacts are no longer findable
          for (const contact of createdContacts) {
            const deletedContact = await contactRepository.findById(contact.id);
            expect(deletedContact).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject contacts with invalid school associations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          isPrimary: fc.boolean()
        }),
        async (contactData: Omit<CreateContactData, 'schoolId'>) => {
          // Try to create contact with non-existent school ID
          const invalidSchoolId = 'non-existent-school-id';
          const contactWithInvalidSchoolId: CreateContactData = {
            ...contactData,
            schoolId: invalidSchoolId
          };
          
          // Should fail due to foreign key constraint
          await expect(contactRepository.create(contactWithInvalidSchoolId)).rejects.toThrow();
          
          // Verify no contact was created
          const allContacts = await contactRepository.findAll();
          expect(allContacts.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain email uniqueness validation', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Contact data with invalid email formats
          fc.oneof(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              email: fc.constant('invalid-email'),
              phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
              position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isPrimary: fc.boolean()
            }),
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              email: fc.constant(''),
              phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
              position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isPrimary: fc.boolean()
            }),
            fc.record({
              name: fc.constant(''),
              email: fc.emailAddress(),
              phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
              position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isPrimary: fc.boolean()
            })
          )
        ),
        async ([schoolData, invalidContactData]: [CreateSchoolData, Omit<CreateContactData, 'schoolId'>]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Try to create contact with invalid data
          const contactWithSchoolId: CreateContactData = {
            ...invalidContactData,
            schoolId: createdSchool.id
          };
          
          // Should fail validation
          await expect(contactRepository.create(contactWithSchoolId)).rejects.toThrow();
          
          // Verify no contact was created
          const contactsBySchool = await contactRepository.findBySchoolId(createdSchool.id);
          expect(contactsBySchool.length).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });
});