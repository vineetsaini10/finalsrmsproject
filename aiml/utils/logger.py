import logging
import sys
import os

def get_logger(name: str) -> logging.Logger:
    """
    Creates and configures a logger for the application.
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Format
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # Console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # File handles (ensuring absolute path to logs directory in root)
        log_dir = os.path.join(os.path.dirname(__file__), '../../logs')
        if os.path.exists(log_dir):
            error_file = logging.FileHandler(os.path.join(log_dir, 'aiml_error.log'))
            error_file.setLevel(logging.ERROR)
            error_file.setFormatter(formatter)
            logger.addHandler(error_file)
            
            combined_file = logging.FileHandler(os.path.join(log_dir, 'aiml_combined.log'))
            combined_file.setFormatter(formatter)
            logger.addHandler(combined_file)
        
    return logger
    
