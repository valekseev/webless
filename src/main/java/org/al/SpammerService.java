package org.al;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SpammerService extends Thread implements Runnable {
    private static final Logger logger = LoggerFactory.getLogger(SpammerService.class);
    private static final SpammerService SPAMMER = new SpammerService();
    
    private volatile boolean fIsRunning = true;

    private SpammerService() {}

    public static SpammerService getInstance() { return SPAMMER; }

    @Override
    public void run() {
        while (fIsRunning) {
            try {
                logger.error("Sleeping...");
                System.out.println("aaa");
                Thread.sleep(10000L);

                logger.debug("Processing");
            } catch (InterruptedException e) {
                logger.error("aaa", e);
                fIsRunning = false;
            }
        }
    }

    public void shutdown() {
        fIsRunning = false;
    }
}