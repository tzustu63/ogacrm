import * as fc from 'fast-check';
import { Pool } from 'pg';
import { SchoolRepository, CreateSchoolData } from '../../src/repositories/schoolRepository';
import { InteractionRepository, CreateInteractionData, UpdateInteractionData } from '../../src/repositories/interactionRepository';
import { Interaction, SchoolType, ContactMethod, RelationshipStatus } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('Interaction Repository Property Tests', () => {
  let pool: Pool;
  let schoolRepository: SchoolRepository;
  let interactionRepository: InteractionRepository;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping InteractionRepository property tests - database not available');
      return;
    }
    
    pool = await setupTestDatabase();
    schoolRepository = new SchoolRepository(pool);
    interactionRepository = new InteractionRepository(pool);
  });

  beforeEach(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') return;
    await cleanupTestDatabase();
  });

  /**
   * **Feature: recruitment-crm, Property 4: 互動記錄時間序列**
   * 對於任何學校的互動記錄，系統應該正確維護首次聯繫日期和最後聯繫日期，並按時間順序顯示所有互動記錄
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   */
  it('should maintain interaction time series correctly', async () => {
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
          // Multiple interactions with different dates
          fc.array(
            fc.record({
              contactMethod: fc.constantFrom(...Object.values(ContactMethod)),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              notes: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
              followUpRequired: fc.boolean(),
              followUpDate: fc.option(fc.date({ min: new Date(), max: new Date('2025-12-31') }), { nil: undefined }),
              createdBy: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 2, maxLength: 10 }
          )
        ),
        async ([schoolData, interactionsData]: [CreateSchoolData, Array<Omit<CreateInteractionData, 'schoolId'>>]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create interactions
          const createdInteractions: Interaction[] = [];
          for (const interactionData of interactionsData) {
            // Ensure follow-up date is after interaction date if both are provided
            const adjustedInteractionData = { ...interactionData };
            if (adjustedInteractionData.followUpRequired && adjustedInteractionData.followUpDate) {
              if (adjustedInteractionData.followUpDate <= adjustedInteractionData.date) {
                adjustedInteractionData.followUpDate = new Date(adjustedInteractionData.date.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
              }
            }
            
            const interactionWithSchoolId: CreateInteractionData = {
              ...adjustedInteractionData,
              schoolId: createdSchool.id
            };
            
            const interaction = await interactionRepository.create(interactionWithSchoolId);
            createdInteractions.push(interaction);
          }
          
          // Get interaction history (should be ordered by date ASC)
          const interactionHistory = await interactionRepository.findInteractionHistory(createdSchool.id);
          expect(interactionHistory.length).toBe(createdInteractions.length);
          
          // Verify chronological ordering in history
          for (let i = 1; i < interactionHistory.length; i++) {
            const prevDate = new Date(interactionHistory[i - 1]!.date);
            const currDate = new Date(interactionHistory[i]!.date);
            expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
          }
          
          // Get school contact dates
          const contactDates = await interactionRepository.getSchoolContactDates(createdSchool.id);
          
          // Verify first contact date is the earliest interaction date
          const sortedDates = interactionsData.map(i => i.date).sort((a, b) => a.getTime() - b.getTime());
          const expectedFirstContact = sortedDates[0]!;
          const expectedLastContact = sortedDates[sortedDates.length - 1]!;
          
          expect(contactDates.firstContact).toBeDefined();
          expect(contactDates.lastContact).toBeDefined();
          expect(contactDates.firstContact!.getTime()).toBe(expectedFirstContact.getTime());
          expect(contactDates.lastContact!.getTime()).toBe(expectedLastContact.getTime());
          
          // Verify all interactions are properly associated with school
          for (const interaction of interactionHistory) {
            expect(interaction.schoolId).toBe(createdSchool.id);
            expect(interaction.id).toBeDefined();
            expect(interaction.createdAt).toBeDefined();
          }
          
          // Verify findAll returns interactions in reverse chronological order (newest first)
          const allInteractions = await interactionRepository.findAll({ schoolId: createdSchool.id });
          expect(allInteractions.length).toBe(createdInteractions.length);
          
          for (let i = 1; i < allInteractions.length; i++) {
            const prevDate = new Date(allInteractions[i - 1]!.date);
            const currDate = new Date(allInteractions[i]!.date);
            expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly update contact dates when interactions are modified', async () => {
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
          // Initial interaction
          fc.record({
            contactMethod: fc.constantFrom(...Object.values(ContactMethod)),
            date: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
            notes: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            followUpRequired: fc.boolean(),
            followUpDate: fc.option(fc.date({ min: new Date(), max: new Date('2025-12-31') }), { nil: undefined }),
            createdBy: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          // Updated date
          fc.date({ min: new Date('2024-01-01'), max: new Date() })
        ),
        async ([schoolData, interactionData, newDate]: [CreateSchoolData, Omit<CreateInteractionData, 'schoolId'>, Date]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Ensure follow-up date is after interaction date if both are provided
          const adjustedInteractionData = { ...interactionData };
          if (adjustedInteractionData.followUpRequired && adjustedInteractionData.followUpDate) {
            if (adjustedInteractionData.followUpDate <= adjustedInteractionData.date) {
              adjustedInteractionData.followUpDate = new Date(adjustedInteractionData.date.getTime() + 24 * 60 * 60 * 1000);
            }
          }
          
          // Create initial interaction
          const interactionWithSchoolId: CreateInteractionData = {
            ...adjustedInteractionData,
            schoolId: createdSchool.id
          };
          const createdInteraction = await interactionRepository.create(interactionWithSchoolId);
          
          // Get initial contact dates
          const initialContactDates = await interactionRepository.getSchoolContactDates(createdSchool.id);
          expect(initialContactDates.firstContact!.getTime()).toBe(interactionData.date.getTime());
          expect(initialContactDates.lastContact!.getTime()).toBe(interactionData.date.getTime());
          
          // Update interaction date
          const updateData: UpdateInteractionData = { date: newDate };
          const updatedInteraction = await interactionRepository.update(createdInteraction.id, updateData);
          
          expect(updatedInteraction).toBeDefined();
          expect(updatedInteraction!.date.getTime()).toBe(newDate.getTime());
          
          // Verify contact dates are updated
          const updatedContactDates = await interactionRepository.getSchoolContactDates(createdSchool.id);
          expect(updatedContactDates.firstContact!.getTime()).toBe(newDate.getTime());
          expect(updatedContactDates.lastContact!.getTime()).toBe(newDate.getTime());
          
          // Verify interaction history reflects the change
          const history = await interactionRepository.findInteractionHistory(createdSchool.id);
          expect(history.length).toBe(1);
          expect(history[0]!.date.getTime()).toBe(newDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty interaction history correctly', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          schoolType: fc.constantFrom(...Object.values(SchoolType))
        }),
        async (schoolData: CreateSchoolData) => {
          // Create school with no interactions
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Verify empty interaction history
          const interactionHistory = await interactionRepository.findInteractionHistory(createdSchool.id);
          expect(interactionHistory.length).toBe(0);
          
          // Verify contact dates are undefined for school with no interactions
          const contactDates = await interactionRepository.getSchoolContactDates(createdSchool.id);
          expect(contactDates.firstContact).toBeUndefined();
          expect(contactDates.lastContact).toBeUndefined();
          
          // Verify count is zero
          const count = await interactionRepository.countBySchoolId(createdSchool.id);
          expect(count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain interaction data integrity during CRUD operations', async () => {
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
          // Interaction data
          fc.record({
            contactMethod: fc.constantFrom(...Object.values(ContactMethod)),
            date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            notes: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            followUpRequired: fc.boolean(),
            followUpDate: fc.option(fc.date({ min: new Date(), max: new Date('2025-12-31') }), { nil: undefined }),
            createdBy: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        ),
        async ([schoolData, interactionData]: [CreateSchoolData, Omit<CreateInteractionData, 'schoolId'>]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Ensure follow-up date is after interaction date if both are provided
          const adjustedInteractionData = { ...interactionData };
          if (adjustedInteractionData.followUpRequired && adjustedInteractionData.followUpDate) {
            if (adjustedInteractionData.followUpDate <= adjustedInteractionData.date) {
              adjustedInteractionData.followUpDate = new Date(adjustedInteractionData.date.getTime() + 24 * 60 * 60 * 1000);
            }
          }
          
          // Create interaction
          const interactionWithSchoolId: CreateInteractionData = {
            ...adjustedInteractionData,
            schoolId: createdSchool.id
          };
          const createdInteraction = await interactionRepository.create(interactionWithSchoolId);
          
          // Verify creation
          expect(createdInteraction.id).toBeDefined();
          expect(createdInteraction.schoolId).toBe(createdSchool.id);
          expect(createdInteraction.contactMethod).toBe(interactionData.contactMethod);
          expect(createdInteraction.date.getTime()).toBe(interactionData.date.getTime());
          expect(createdInteraction.notes).toBe(interactionData.notes);
          expect(createdInteraction.followUpRequired).toBe(interactionData.followUpRequired || false);
          expect(createdInteraction.createdBy).toBe(interactionData.createdBy);
          expect(createdInteraction.createdAt).toBeDefined();
          
          // Verify retrieval by ID
          const retrievedInteraction = await interactionRepository.findById(createdInteraction.id);
          expect(retrievedInteraction).toBeDefined();
          expect(retrievedInteraction!.id).toBe(createdInteraction.id);
          expect(retrievedInteraction!.schoolId).toBe(createdSchool.id);
          
          // Verify retrieval by school ID
          const schoolInteractions = await interactionRepository.findBySchoolId(createdSchool.id);
          expect(schoolInteractions.length).toBe(1);
          expect(schoolInteractions[0]!.id).toBe(createdInteraction.id);
          
          // Delete interaction
          const deleteResult = await interactionRepository.delete(createdInteraction.id);
          expect(deleteResult).toBe(true);
          
          // Verify deletion
          const deletedInteraction = await interactionRepository.findById(createdInteraction.id);
          expect(deletedInteraction).toBeNull();
          
          const schoolInteractionsAfterDelete = await interactionRepository.findBySchoolId(createdSchool.id);
          expect(schoolInteractionsAfterDelete.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 5: 關係狀態同步**
   * 對於任何學校記錄，當更新互動記錄中的關係狀態時，學校記錄的當前狀態應該同步更新
   * **Validates: Requirements 3.5**
   */
  it('should synchronize relationship status between interactions and school records', async () => {
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
            relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
          }),
          // New relationship status to update to
          fc.constantFrom(...Object.values(RelationshipStatus))
        ),
        async ([schoolData, newRelationshipStatus]: [CreateSchoolData, RelationshipStatus]) => {
          // Create school with initial relationship status
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Verify initial relationship status
          const initialSchool = await schoolRepository.findById(createdSchool.id);
          expect(initialSchool).toBeDefined();
          expect(initialSchool!.relationshipStatus).toBe(schoolData.relationshipStatus || RelationshipStatus.POTENTIAL);
          
          // Update relationship status through interaction repository
          const updateResult = await interactionRepository.updateRelationshipStatus(createdSchool.id, newRelationshipStatus);
          expect(updateResult).toBe(true);
          
          // Verify school's relationship status is synchronized
          const updatedSchool = await schoolRepository.findById(createdSchool.id);
          expect(updatedSchool).toBeDefined();
          expect(updatedSchool!.relationshipStatus).toBe(newRelationshipStatus);
          expect(updatedSchool!.id).toBe(createdSchool.id);
          expect(updatedSchool!.name).toBe(createdSchool.name);
          
          // Verify the update timestamp is more recent
          expect(new Date(updatedSchool!.updatedAt).getTime()).toBeGreaterThan(new Date(createdSchool.updatedAt).getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle relationship status updates for non-existent schools', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(RelationshipStatus)),
        async (relationshipStatus: RelationshipStatus) => {
          // Try to update relationship status for non-existent school
          const nonExistentSchoolId = 'non-existent-school-id';
          const updateResult = await interactionRepository.updateRelationshipStatus(nonExistentSchoolId, relationshipStatus);
          
          // Should return false for non-existent school
          expect(updateResult).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain relationship status consistency across multiple updates', async () => {
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
          // Sequence of relationship status updates
          fc.array(fc.constantFrom(...Object.values(RelationshipStatus)), { minLength: 2, maxLength: 5 })
        ),
        async ([schoolData, statusSequence]: [CreateSchoolData, RelationshipStatus[]]) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Apply sequence of relationship status updates
          let lastUpdateTime = new Date(createdSchool.updatedAt).getTime();
          
          for (const status of statusSequence) {
            const updateResult = await interactionRepository.updateRelationshipStatus(createdSchool.id, status);
            expect(updateResult).toBe(true);
            
            // Verify the status is correctly updated
            const currentSchool = await schoolRepository.findById(createdSchool.id);
            expect(currentSchool).toBeDefined();
            expect(currentSchool!.relationshipStatus).toBe(status);
            
            // Verify update timestamp progresses
            const currentUpdateTime = new Date(currentSchool!.updatedAt).getTime();
            expect(currentUpdateTime).toBeGreaterThanOrEqual(lastUpdateTime);
            lastUpdateTime = currentUpdateTime;
          }
          
          // Final verification: school should have the last status in sequence
          const finalSchool = await schoolRepository.findById(createdSchool.id);
          expect(finalSchool).toBeDefined();
          expect(finalSchool!.relationshipStatus).toBe(statusSequence[statusSequence.length - 1]);
        }
      ),
      { numRuns: 100 }
    );
  });
});