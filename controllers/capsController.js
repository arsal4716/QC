const Cap = require('../models/Caps');
const getCurrentESTDate = () => {
  const now = new Date();
  const estOffset = -5 * 60; 
  const estTime = new Date(now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000);
  return estTime.toISOString().split('T')[0];
};

exports.getCaps = async (req, res) => {
  try {
    const caps = await Cap.find().sort({ name: 1 });
    
    const transformedCaps = caps.map(cap => {
      const today = getCurrentESTDate();
      const todayData = cap.dailyCalls.find(entry => entry.date === today);
      
      return {
        _id: cap._id,
        name: cap.name,
        target: cap.target,
        completedCalls: todayData ? todayData.completedCalls : 0,
        paidCalls: todayData ? todayData.paidCalls : 0,
        totalCompletedCalls: cap.totalCompletedCalls,
        totalPaidCalls: cap.totalPaidCalls,
        updatedAt: cap.updatedAt
      };
    });
    
    res.json({ success: true, data: transformedCaps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;
    const updated = await Cap.findByIdAndUpdate(id, { target }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.processPixelFire = async (req, res) => {
  try {
    const { target_id, status, paid, duration } = req.query;
    
    if (!target_id) {
      return res.status(400).json({ success: false, message: "target_id is required" });
    }

    const isCompleted = status === 'completed' || status === 'success' || duration > 0;
    
    if (!isCompleted) {
      return res.json({ success: true, message: "Call not completed, skipping" });
    }

    const today = getCurrentESTDate();
    let target = await Cap.findOne({ name: target_id });
    
    if (!target) {
      target = new Cap({
        name: target_id,
        target: 0,
        dailyCalls: [{
          date: today,
          completedCalls: 1,
          paidCalls: paid === 'True' || paid === 'true' ? 1 : 0
        }],
        totalCompletedCalls: 1,
        totalPaidCalls: paid === 'True' || paid === 'true' ? 1 : 0
      });
    } else {
      let todayEntry = target.dailyCalls.find(entry => entry.date === today);
      
      if (!todayEntry) {
        todayEntry = {
          date: today,
          completedCalls: 1,
          paidCalls: paid === 'True' || paid === 'true' ? 1 : 0
        };
        target.dailyCalls.push(todayEntry);
      } else {
        todayEntry.completedCalls += 1;
        if (paid === 'True' || paid === 'true') {
          todayEntry.paidCalls += 1;
        }
      }
      
      target.totalCompletedCalls += 1;
      if (paid === 'True' || paid === 'true') {
        target.totalPaidCalls += 1;
      }
      
      target.updatedAt = new Date();
    }

    await target.save();

    res.json({ 
      success: true, 
      message: "Pixel processed successfully",
      data: target
    });

  } catch (err) {
    console.error("Error processing pixel fire:", err);
    res.json({ 
      success: false, 
      message: "Call recorded but server encountered an issue"
    });
  }
};

exports.cleanupOldData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const caps = await Cap.find();
    for (const cap of caps) {
      cap.dailyCalls = cap.dailyCalls.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= thirtyDaysAgo;
      });
      await cap.save();
    }
    console.log('Old daily data cleaned up');
  } catch (err) {
    console.error('Error cleaning up old data:', err);
  }
};