const Message = require('../models/messages');

const truncateMessages = async (req, res) => {
  try {
    await Message.destroy({
      where: {},      
      truncate: true,  
    });

    return res.status(200).json({
      success: true,
      message: 'All messages have been deleted successfully.',
    });
  } catch (error) {
    console.error('Error truncating messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting messages.',
      error: error.message,
    });
  }
};

module.exports = {
  truncateMessages,
};
