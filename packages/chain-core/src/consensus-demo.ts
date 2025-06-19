/**
 * Consensus Demo - Shows how the Proof of Knowledge consensus works
 * 
 * This demonstration script shows a complete workflow of:
 * 1. User makes progress on a lesson
 * 2. System selects a puzzle based on that progress
 * 3. User "solves" the puzzle to mine a block
 * 4. System verifies the solution
 */

import { 
  selectPuzzleForUser, 
  proposeBlock, 
  verifyPuzzleSolution,
  verifyPuzzleSolutionWithContext 
} from './consensus.js';
import { ChainDB } from './database.js';
import { generateKeyPair, hash, sign } from './crypto.js';
import type { Block, Transaction, LessonProgressData } from './types.js';

/**
 * Run a complete consensus demonstration
 */
export async function runConsensusDemo(): Promise<void> {
  console.log('🎓 APStat Chain - Proof of Knowledge Consensus Demo');
  console.log('================================================\n');

  // Step 1: Setup
  console.log('1️⃣ Setting up blockchain...');
  const db = new ChainDB();
  await db.open();
  
  const studentKeyPair = generateKeyPair();
  console.log(`   👤 Student Public Key: ${studentKeyPair.publicKey.substring(0, 16)}...`);

  // Create genesis block
  const genesisBlock: Block = {
    header: {
      version: 1,
      previousHash: '0'.repeat(64),
      merkleRoot: hash(''),
      timestamp: Date.now(),
      nonce: 0,
      proofOfAccessHash: '0'.repeat(64),
      difficulty: 1,
      height: 0,
      hash: '1'.repeat(64)
    },
    transactions: [],
    attestations: []
  };
  
  await db.addBlock(genesisBlock);
  console.log('   ✅ Genesis block created\n');

  // Step 2: Student makes progress
  console.log('2️⃣ Student completes Lesson 1-1...');
  const progressTx: Transaction = {
    id: hash({
      type: 'LESSON_PROGRESS',
      data: {
        lessonId: '1-1',
        progressType: 'lesson_completed',
        status: 'completed',
        progressPercentage: 100,
        timeSpent: 1800
      },
      publicKey: studentKeyPair.publicKey,
      timestamp: Date.now()
    }),
    type: 'LESSON_PROGRESS',
    data: {
      lessonId: '1-1',
      progressType: 'lesson_completed',
      status: 'completed',
      progressPercentage: 100,
      timeSpent: 1800
    } as LessonProgressData,
    signature: sign({
      lessonId: '1-1',
      progressType: 'lesson_completed',
      status: 'completed'
    }, studentKeyPair.privateKey),
    publicKey: studentKeyPair.publicKey,
    timestamp: Date.now(),
    priority: 'normal'
  };

  // Add progress to blockchain
  const progressBlock: Block = {
    header: {
      version: 1,
      previousHash: genesisBlock.header.hash!,
      merkleRoot: hash([progressTx]),
      timestamp: Date.now(),
      nonce: 0,
      proofOfAccessHash: hash('proof'),
      difficulty: 1,
      height: 1,
      hash: hash({ height: 1, progressTx })
    },
    transactions: [progressTx],
    attestations: []
  };

  await db.addBlock(progressBlock);
  console.log('   📝 Progress recorded on blockchain');
  console.log(`   📊 Lesson: ${(progressTx.data as LessonProgressData).lessonId}`);
  console.log(`   ✅ Status: ${(progressTx.data as LessonProgressData).status}\n`);

  // Step 3: System selects puzzle for mining
  console.log('3️⃣ Selecting puzzle for mining...');
  const puzzleData = await selectPuzzleForUser(studentKeyPair.publicKey, db);
  
  if (!puzzleData) {
    console.log('   ❌ No puzzle available for this student');
    return;
  }

  const { puzzle, proofOfAccessHash } = puzzleData;
  console.log(`   🧩 Selected puzzle: ${puzzle.questionId}`);
  console.log(`   📚 Lesson: ${puzzle.lessonId}`);
  console.log(`   ❓ Question: ${puzzle.questionText}`);
  console.log('   📝 Answer choices:');
  puzzle.answers.forEach((answer, index) => {
    const marker = index === puzzle.correctAnswerIndex ? '✅' : '  ';
    console.log(`     ${marker} ${index}: ${answer}`);
  });
  console.log(`   🔍 Proof of Access Hash: ${proofOfAccessHash.substring(0, 16)}...\n`);

  // Step 4: Student "solves" the puzzle (in real system, this would be interactive)
  console.log('4️⃣ Student solves the puzzle...');
  const solution = puzzle.correctAnswerIndex;
  console.log(`   🎯 Student selects answer: ${solution}`);
  console.log(`   ✅ Correct! Student can now mine a block\n`);

  // Step 5: Propose new block
  console.log('5️⃣ Mining new block...');
  const newTransactions: Transaction[] = []; // Empty block for simplicity
  
  const newBlock = proposeBlock(
    newTransactions,
    progressBlock,
    solution,
    proofOfAccessHash
  );

  console.log(`   ⛏️  Block proposed with height: ${newBlock.header.height}`);
  console.log(`   🔢 Nonce (solution): ${newBlock.header.nonce}`);
  console.log(`   🔗 Previous hash: ${newBlock.header.previousHash.substring(0, 16)}...`);
  console.log(`   🧮 Block hash: ${newBlock.header.hash?.substring(0, 16)}...\n`);

  // Step 6: Verify the solution
  console.log('6️⃣ Verifying puzzle solution...');
  const isValidSimple = verifyPuzzleSolution(newBlock.header);
  console.log(`   🔍 Simple verification: ${isValidSimple ? '✅ VALID' : '❌ INVALID'}`);

  const isValidWithContext = await verifyPuzzleSolutionWithContext(newBlock.header, db);
  console.log(`   🔍 Context verification: ${isValidWithContext ? '✅ VALID' : '❌ INVALID'}`);

  if (isValidSimple && isValidWithContext) {
    console.log('   🎉 Block successfully mined and verified!');
    await db.addBlock(newBlock);
    console.log('   📦 Block added to blockchain');
  } else {
    console.log('   ❌ Block verification failed');
  }

  // Step 7: Show chain status
  console.log('\n7️⃣ Final blockchain status:');
  const latestBlock = await db.getLatestBlock();
  const blockCount = await db.getBlockCount();
  
  console.log(`   📏 Chain height: ${latestBlock?.header.height}`);
  console.log(`   📦 Total blocks: ${blockCount}`);
  console.log(`   🎓 Educational achievements verified by Proof of Knowledge!`);

  // Cleanup
  await db.close();
  console.log('\n🏁 Demo completed successfully!');
}

/**
 * Run the demo if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runConsensusDemo().catch(console.error);
} 