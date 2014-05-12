package org.al;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SpammerService extends Thread {
    public static final String FILENAME = "filename.txt";
    private static final Charset CHARSET = StandardCharsets.UTF_8;
    private static final Logger logger = LoggerFactory.getLogger(SpammerService.class);
    private static final SpammerService SPAMMER = new SpammerService();
    
    private final static long MAX_LEN = 10_000_000L;
    
    private final static String[] THREADS = { "Producer", "Consumer", "Thread-1", "Thread-2", "Thread-3" };
    private final static String[] SOURCES = { "Producer.java:111", "Consumer.java:112", "Timer.java:555" };
    private final static String TEXT = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod "
            + "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation "
            + "ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in "
            + "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, "
            + "sunt in culpa qui officia deserunt mollit anim id est laborum";
    private final static String[] WORDS = TEXT.split(" ");
    
    private volatile boolean isRunning = true;
    
    private SpammerService() {}

    public static SpammerService getInstance() { return SPAMMER; }

    @Override
    public void run() {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
        
        Random random = new Random();
        File file = new File(FILENAME);
        Writer writer = null;
        try
        {
            writer = new OutputStreamWriter(new FileOutputStream(file), CHARSET);
            while (isRunning) {
                try {
                    if (file.length() > MAX_LEN) {
                        writer.close();
                        writer = new OutputStreamWriter(new FileOutputStream(file), CHARSET);
                    }
                    Thread.sleep(random.nextInt(200));
                    StringBuilder builder = new StringBuilder(200);
                    builder.append(dateFormat.format(new Date()))
                           .append(" [").append(THREADS[random.nextInt(THREADS.length)]).append("]")
                           .append(" [").append(SOURCES[random.nextInt(SOURCES.length)]).append("]");
                    for (int i = 5; i < random.nextInt(20) + 10; i++) {
                        builder.append(" ").append(WORDS[random.nextInt(WORDS.length)]);
                    }
                    builder.append("\n");
                    writer.write(builder.toString());
                    writer.flush();
                } catch (InterruptedException e) {
                    logger.info("Interrupted!!!!!");
                    isRunning = false;
                }
            }
        } catch (IOException e) {
            logger.error("",e);
        } finally {
            try { writer.close(); } catch (IOException e) { logger.error("", e); }
        }

    }

    public void shutdown() {
        isRunning=false;
        interrupt(); 
    }
}