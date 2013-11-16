package org.al;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.channels.FileChannel;
import java.nio.file.OpenOption;
import java.nio.file.StandardOpenOption;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SpammerService extends Thread implements Runnable {
    private static final Logger logger = LoggerFactory.getLogger(SpammerService.class);
    private static final SpammerService SPAMMER = new SpammerService();
    
    private final static long MAX_LEN = 5_000_000L;
    
    private final static String[] THREADS = {"Producer","Consumer","Thread-1","Thread-2","Thread-3"};
    private final static String[] SOURCES = {"Producer.java:111", "Consumer.java:112", "Timer.java:555"};
    private final static String TEXT = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod "
            + "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation "
            + "ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in "
            + "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, "
            + "sunt in culpa qui officia deserunt mollit anim id est laborum";
    private final static String[] WORDS = TEXT.split(" ");
    
    
    private volatile boolean fIsRunning = true;
    
    private SpammerService() {}

    public static SpammerService getInstance() { return SPAMMER; }

    @Override
    public void run() {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss,S");
        StringBuilder builder = new StringBuilder();
        Random random = new Random();
        File file = new File("filename.txt");
        try (Writer writer = new OutputStreamWriter(new FileOutputStream(file), "utf-8"); )
        {
            while (fIsRunning) {
                try {
                    if (file.length() > MAX_LEN) {
                        
                    }
                    Thread.sleep(random.nextInt(1000));
                    builder.append(dateFormat.format(new Date()))
                    .append(" [").append(THREADS[random.nextInt(THREADS.length)]).append("]")
                    .append(" [").append(SOURCES[random.nextInt(SOURCES.length)]).append("]");
                    for (int i=5;i<random.nextInt(20)+10;i++){
                        builder.append(" ").append(WORDS[random.nextInt(WORDS.length)]);
                    }
                    builder.append("\n");
                    writer.write(builder.toString());
                } catch (InterruptedException e) {
                    fIsRunning = false;
                }
            }
        } catch (IOException e) {
            logger.error("",e);
        } 

    }

    public void shutdown() {
        fIsRunning=false;
        Thread.currentThread().interrupt();
    }
}